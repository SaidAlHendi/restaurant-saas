import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Request, Response } from 'express';

import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../core/errors/app-errors';
import { JwtAccessService } from '../../core/auth/jwt.service';
import { RefreshTokenService } from '../../core/auth/refresh-token.service';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { setOrgLocal } from '../../core/db/with-org';
import { withUser } from '../../core/db/with-user';
import { newUuidV7 } from '../../lib/uuid';
import { isPgUniqueViolation } from '../../lib/pg-errors';
import { slugifyBase, slugWithSuffix } from '../../lib/slug';
import type { SignupBody, LoginBody, SwitchOrgBody } from '@app/shared';

import {
  LOGIN_INVALID_MESSAGE,
  SYSTEM_OWNER_ROLE_ID,
} from './constants';
import { IdentityRepository } from './identity.repository';
import { TenancyRepository } from '../tenancy/tenancy.repository';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identityRepo: IdentityRepository,
    private readonly tenancyRepo: TenancyRepository,
    private readonly jwt: JwtAccessService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async signup(body: SignupBody, req: Request, res: Response) {
    const email = body.email.toLowerCase();
    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });

    const userId = newUuidV7();
    const newOrgId = newUuidV7();
    const branchId = newUuidV7();
    const membershipId = newUuidV7();
    const sessionId = newUuidV7();
    const familyId = newUuidV7();

    const baseSlug = slugifyBase(body.restaurantName) || 'restaurant';
    let slug = baseSlug;
    let suffix = 0;

    const result = await this.db.transaction(async (tx) => {
      const existing = await this.identityRepo.findUserByEmail(tx, email);
      if (existing) {
        throw new ValidationError('Email already registered');
      }

      await this.identityRepo.insertUser(tx, {
        id: userId,
        email,
        passwordHash,
        name: body.name,
        locale: body.defaultLocale,
      });

      while (await this.tenancyRepo.isOrgSlugTakenForSignup(tx, slug)) {
        suffix += 1;
        slug = slugWithSuffix(baseSlug, suffix);
        if (suffix > 50) {
          throw new ValidationError('Could not allocate a unique organization slug');
        }
      }

      await tx.execute(setOrgLocal(newOrgId));

      let org;
      try {
        org = await this.tenancyRepo.insertOrganization(tx, {
          id: newOrgId,
          name: body.restaurantName,
          slug,
          country: body.country,
          defaultCurrency: body.currency,
          defaultLocale: body.defaultLocale,
          locales: [body.defaultLocale],
          status: 'trial',
        });
      } catch (err: unknown) {
        if (isPgUniqueViolation(err)) {
          throw new ValidationError('Organization slug already taken');
        }
        throw err;
      }

      const branchBaseSlug = slugifyBase(body.restaurantName) || 'main';
      let branchSlug = branchBaseSlug;
      let branchSuffix = 0;
      let branch;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
          branch = await this.tenancyRepo.insertBranch(tx, {
            id: branchId,
            orgId: newOrgId,
            name: body.restaurantName,
            slug: branchSlug,
            timezone: body.timezone,
            currency: body.currency,
          });
          break;
        } catch (err: unknown) {
          if (!isPgUniqueViolation(err)) {
            throw err;
          }
          branchSuffix += 1;
          branchSlug = slugWithSuffix(branchBaseSlug, branchSuffix);
        }
      }
      if (!branch) {
        throw new ValidationError('Could not allocate a unique branch slug');
      }

      await this.tenancyRepo.insertMembership(tx, {
        id: membershipId,
        orgId: newOrgId,
        userId,
        roleId: SYSTEM_OWNER_ROLE_ID,
        allBranches: true,
        status: 'active',
      });

      const { accessToken } = await this.createSession(tx, {
        userId,
        orgId: newOrgId,
        sessionId,
        familyId,
        req,
        res,
      });

      return { accessToken, org, branch };
    });

    const user = await this.db.transaction(async (tx) => this.identityRepo.findUserById(tx, userId));
    if (!user) {
      throw new NotFoundError('User not found after signup');
    }

    return {
      accessToken: result.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale as 'ar' | 'en',
      },
      org: { id: result.org.id, name: result.org.name, slug: result.org.slug },
      branch: { id: result.branch.id, name: result.branch.name, slug: result.branch.slug },
    };
  }

  async login(body: LoginBody, req: Request, res: Response) {
    const email = body.email.toLowerCase();
    const user = await this.db.transaction(async (tx) => this.identityRepo.findUserByEmail(tx, email));
    if (!user) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', LOGIN_INVALID_MESSAGE);
    }
    const valid = await argon2.verify(user.passwordHash, body.password);
    if (!valid) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', LOGIN_INVALID_MESSAGE);
    }

    const orgId = await this.resolveLoginOrgId(user.id, user.lastOrgId);
    const sessionId = newUuidV7();
    const familyId = newUuidV7();

    const accessToken = await this.db.transaction(async (tx) => {
      await this.identityRepo.updateUserLastLogin(tx, user.id);
      const { accessToken: token } = await this.createSession(tx, {
        userId: user.id,
        orgId,
        sessionId,
        familyId,
        req,
        res,
      });
      return token;
    });

    const org = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(orgId));
      return this.tenancyRepo.findOrganizationById(tx, orgId);
    });
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale as 'ar' | 'en',
      },
      org: { id: org.id, name: org.name, slug: org.slug },
    };
  }

  async refresh(req: Request, res: Response) {
    const raw = this.refreshTokens.readRawFromRequest(req);
    if (!raw) {
      this.refreshTokens.clearCookie(res);
      throw new UnauthorizedError('REFRESH_MISSING', 'Refresh token required');
    }
    const hash = this.refreshTokens.hashToken(raw);
    const session = await this.db.transaction(async (tx) =>
      this.identityRepo.findSessionByHash(tx, hash),
    );
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      this.refreshTokens.clearCookie(res);
      throw new UnauthorizedError('REFRESH_INVALID', 'Session expired');
    }
    if (session.replacedBy) {
      await this.db.transaction(async (tx) =>
        this.identityRepo.revokeSessionFamily(tx, session.familyId),
      );
      this.refreshTokens.clearCookie(res);
      throw new UnauthorizedError('REFRESH_REUSE', 'Refresh token reuse detected');
    }

    const user = await this.db.transaction(async (tx) =>
      this.identityRepo.findUserById(tx, session.userId),
    );
    if (!user) {
      this.refreshTokens.clearCookie(res);
      throw new UnauthorizedError('REFRESH_INVALID', 'Session expired');
    }

    const orgId = await this.resolveLoginOrgId(user.id, user.lastOrgId);
    const membership = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(orgId));
      return this.identityRepo.findMembershipForUserOrg(tx, user.id, orgId);
    });
    if (!membership || membership.status !== 'active') {
      this.refreshTokens.clearCookie(res);
      throw new UnauthorizedError('MEMBERSHIP_DISABLED', 'Membership is not active');
    }

    const newSessionId = newUuidV7();
    const newRaw = this.refreshTokens.generateRawToken();
    const newHash = this.refreshTokens.hashToken(newRaw);

    await this.db.transaction(async (tx) => {
      await this.identityRepo.revokeSession(tx, session.id, newSessionId);
      await this.identityRepo.insertSession(tx, {
        id: newSessionId,
        userId: session.userId,
        tokenHash: newHash,
        familyId: session.familyId,
        expiresAt: this.refreshTokens.expiresAt(),
        userAgent: req.headers['user-agent']?.slice(0, 512),
        ip: req.ip,
      });
    });

    const accessToken = this.jwt.sign({ sub: user.id, org: orgId, sid: newSessionId });
    this.refreshTokens.setCookie(res, newRaw);
    return { accessToken };
  }

  async logout(req: Request, res: Response) {
    const raw = this.refreshTokens.readRawFromRequest(req);
    if (raw) {
      const hash = this.refreshTokens.hashToken(raw);
      await this.db.transaction(async (tx) => {
        const session = await this.identityRepo.findSessionByHash(tx, hash);
        if (session && !session.revokedAt) {
          await this.identityRepo.revokeSession(tx, session.id);
        }
      });
    }
    this.refreshTokens.clearCookie(res);
  }

  async switchOrg(userId: string, body: SwitchOrgBody, req: Request, res: Response) {
    const membership = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(body.orgId));
      return this.identityRepo.findMembershipForUserOrg(tx, userId, body.orgId);
    });
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenError('Not a member of this organization');
    }

    await this.db.transaction(async (tx) => {
      await this.identityRepo.updateUserLastOrg(tx, userId, body.orgId);
    });

    const sessionId = newUuidV7();
    const familyId = newUuidV7();
    const accessToken = await this.db.transaction(async (tx) => {
      const { accessToken: token } = await this.createSession(tx, {
        userId,
        orgId: body.orgId,
        sessionId,
        familyId,
        req,
        res,
      });
      return token;
    });

    const org = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(body.orgId));
      return this.tenancyRepo.findOrganizationById(tx, body.orgId);
    });
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return {
      accessToken,
      org: { id: org.id, name: org.name, slug: org.slug },
    };
  }

  private async createSession(
    tx: Parameters<Parameters<DrizzleDb['transaction']>[0]>[0],
    input: {
      userId: string;
      orgId: string;
      sessionId: string;
      familyId: string;
      req: Request;
      res: Response;
    },
  ) {
    const raw = this.refreshTokens.generateRawToken();
    const hash = this.refreshTokens.hashToken(raw);
    await this.identityRepo.insertSession(tx, {
      id: input.sessionId,
      userId: input.userId,
      tokenHash: hash,
      familyId: input.familyId,
      expiresAt: this.refreshTokens.expiresAt(),
      userAgent: input.req.headers['user-agent']?.slice(0, 512),
      ip: input.req.ip,
    });
    await this.identityRepo.updateUserLastOrg(tx, input.userId, input.orgId);
    const accessToken = this.jwt.sign({
      sub: input.userId,
      org: input.orgId,
      sid: input.sessionId,
    });
    this.refreshTokens.setCookie(input.res, raw);
    return { accessToken };
  }

  private async resolveLoginOrgId(userId: string, lastOrgId: string | null): Promise<string> {
    return withUser(this.db, userId, async (tx) => {
      const memberships = await this.identityRepo.listActiveMembershipsForUser(tx, userId);
      if (memberships.length === 0) {
        throw new ForbiddenError('No active organization membership', {}, 'NO_ACTIVE_MEMBERSHIP');
      }
      if (lastOrgId) {
        const still = memberships.find((m) => m.org.id === lastOrgId);
        if (still) {
          return lastOrgId;
        }
      }
      const first = memberships[0];
      if (!first) {
        throw new ForbiddenError('No active organization membership', {}, 'NO_ACTIVE_MEMBERSHIP');
      }
      return first.org.id;
    });
  }
}
