import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
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

type Tx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

@Injectable()
export class AuthService implements OnModuleInit {
  private timingMitigationPasswordHash = '';

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identityRepo: IdentityRepository,
    private readonly tenancyRepo: TenancyRepository,
    private readonly jwt: JwtAccessService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTimingMitigationHash();
  }

  private async ensureTimingMitigationHash(): Promise<string> {
    if (this.timingMitigationPasswordHash.length === 0) {
      this.timingMitigationPasswordHash = await argon2.hash('local-timing-mitigation-v1', {
        type: argon2.argon2id,
      });
    }
    return this.timingMitigationPasswordHash;
  }

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
    const branchBaseSlug = slugifyBase(body.restaurantName) || 'main';

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

      const org = await this.insertOrganizationUniqueSlug(tx, newOrgId, baseSlug, {
        name: body.restaurantName,
        country: body.country,
        defaultCurrency: body.currency,
        defaultLocale: body.defaultLocale,
        locales: [body.defaultLocale],
        status: 'trial',
      });

      const branch = await this.insertBranchUniqueSlug(tx, newOrgId, branchId, branchBaseSlug, {
        name: body.restaurantName,
        timezone: body.timezone,
        currency: body.currency,
      });

      await tx.execute(setOrgLocal(newOrgId));
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
    const hashToVerify = user?.passwordHash ?? (await this.ensureTimingMitigationHash());
    const valid = await argon2.verify(hashToVerify, body.password);
    if (!user || !valid) {
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

    const orgId = await this.resolveRefreshOrgId(user.id, session.orgId, user.lastOrgId);

    const newSessionId = newUuidV7();
    const newRaw = this.refreshTokens.generateRawToken();
    const newHash = this.refreshTokens.hashToken(newRaw);

    const rotated = await this.db.transaction(async (tx) =>
      this.identityRepo.rotateRefreshSession(tx, {
        currentSessionId: session.id,
        newSession: {
          id: newSessionId,
          userId: session.userId,
          orgId,
          tokenHash: newHash,
          familyId: session.familyId,
          expiresAt: this.refreshTokens.expiresAt(),
          userAgent: req.headers['user-agent']?.slice(0, 512),
          ip: req.ip,
        },
      }),
    );

    if (!rotated) {
      await this.db.transaction(async (tx) =>
        this.identityRepo.revokeSessionFamily(tx, session.familyId),
      );
      this.refreshTokens.clearCookie(res);
      throw new UnauthorizedError('REFRESH_REUSE', 'Refresh token reuse detected');
    }

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

  async switchOrg(
    userId: string,
    currentSessionId: string,
    body: SwitchOrgBody,
    req: Request,
    res: Response,
  ) {
    const membership = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(body.orgId));
      return this.identityRepo.findMembershipForUserOrg(tx, userId, body.orgId);
    });
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenError('Not a member of this organization');
    }

    const session = await this.db.transaction(async (tx) =>
      this.identityRepo.findSessionById(tx, currentSessionId),
    );
    if (!session || session.userId !== userId || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedError('SESSION_INVALID', 'Session is not active');
    }

    const newSessionId = newUuidV7();
    const newRaw = this.refreshTokens.generateRawToken();
    const newHash = this.refreshTokens.hashToken(newRaw);

    const rotated = await this.db.transaction(async (tx) => {
      await this.identityRepo.updateUserLastOrg(tx, userId, body.orgId);
      return this.identityRepo.rotateRefreshSession(tx, {
        currentSessionId: session.id,
        newSession: {
          id: newSessionId,
          userId,
          orgId: body.orgId,
          tokenHash: newHash,
          familyId: session.familyId,
          expiresAt: this.refreshTokens.expiresAt(),
          userAgent: req.headers['user-agent']?.slice(0, 512),
          ip: req.ip,
        },
      });
    });

    if (!rotated) {
      throw new UnauthorizedError('SESSION_INVALID', 'Session is not active');
    }

    const accessToken = this.jwt.sign({ sub: userId, org: body.orgId, sid: newSessionId });
    this.refreshTokens.setCookie(res, newRaw);

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

  private async insertOrganizationUniqueSlug(
    tx: Tx,
    orgId: string,
    baseSlug: string,
    row: Omit<Parameters<TenancyRepository['insertOrganization']>[1], 'id' | 'slug'>,
  ) {
    for (let suffix = 0; suffix <= 50; suffix += 1) {
      const slug = suffix === 0 ? baseSlug : slugWithSuffix(baseSlug, suffix);
      try {
        return await tx.transaction(async (sp) => {
          await sp.execute(setOrgLocal(orgId));
          return this.tenancyRepo.insertOrganization(sp, { ...row, id: orgId, slug });
        });
      } catch (err: unknown) {
        if (isPgUniqueViolation(err, 'organizations_slug_unique')) {
          continue;
        }
        throw err;
      }
    }
    throw new ValidationError('Could not allocate a unique organization slug');
  }

  private async insertBranchUniqueSlug(
    tx: Tx,
    orgId: string,
    branchId: string,
    baseSlug: string,
    row: Omit<Parameters<TenancyRepository['insertBranch']>[1], 'id' | 'slug' | 'orgId'>,
  ) {
    for (let suffix = 0; suffix <= 50; suffix += 1) {
      const slug = suffix === 0 ? baseSlug : slugWithSuffix(baseSlug, suffix);
      try {
        return await tx.transaction(async (sp) => {
          await sp.execute(setOrgLocal(orgId));
          return this.tenancyRepo.insertBranch(sp, { ...row, id: branchId, orgId, slug });
        });
      } catch (err: unknown) {
        if (isPgUniqueViolation(err, 'branches_org_slug_unique')) {
          continue;
        }
        throw err;
      }
    }
    throw new ValidationError('Could not allocate a unique branch slug');
  }

  private async createSession(
    tx: Tx,
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
      orgId: input.orgId,
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

  private async resolveRefreshOrgId(
    userId: string,
    sessionOrgId: string,
    lastOrgId: string | null,
  ): Promise<string> {
    const activeForSessionOrg = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(sessionOrgId));
      return this.identityRepo.findMembershipForUserOrg(tx, userId, sessionOrgId);
    });
    if (activeForSessionOrg?.status === 'active') {
      return sessionOrgId;
    }
    return this.resolveLoginOrgId(userId, lastOrgId);
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
