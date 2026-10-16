import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { ENV, type Env } from '../../config/config.module';
import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { UnauthorizedError } from '../../core/errors/app-errors';
import { OrgSettingsService } from '../tenancy/org-settings.service';

import { BillingRepository } from './billing.repository';
import { verifyCheckoutOrgId } from './checkout-org-signature';
import { EntitlementsService } from './entitlements.service';
import { isLivePaddleSubscription } from './is-live-paddle-subscription';
import {
  mapPaddleWebhookPayload,
  readPaddleEventEnvelope,
  type MappedSubscriptionEvent,
  type MappedTransactionEvent,
} from './paddle-webhook.mapper';
import { verifyPaddleWebhookSignature } from './paddle-webhook-signature';
import { paddlePriceMapFromEnv } from './paddle-price-map';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PaddleWebhookService implements OnModuleInit {
  private readonly logger = new Logger(PaddleWebhookService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly billingRepo: BillingRepository,
    private readonly entitlements: EntitlementsService,
    private readonly orgSettings: OrgSettingsService,
  ) {}

  onModuleInit(): void {
    if (this.env.PADDLE_WEBHOOK_SECRET === undefined) {
      this.logger.warn(
        'PADDLE_WEBHOOK_SECRET is not set; all Paddle webhooks will be rejected with 401',
      );
    }
  }

  async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined): Promise<void> {
    const ok = verifyPaddleWebhookSignature({
      secret: this.env.PADDLE_WEBHOOK_SECRET,
      header: signatureHeader,
      rawBody,
      nowMs: this.clock.now().getTime(),
    });
    if (!ok) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Invalid Paddle webhook signature');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as unknown;
    } catch {
      throw new UnauthorizedError('UNAUTHORIZED', 'Invalid Paddle webhook body');
    }

    const priceMap = paddlePriceMapFromEnv(this.env);
    const mapped = mapPaddleWebhookPayload(payload, priceMap);
    if (mapped === null) {
      // Signed but unreadable: keep a record when Paddle gave us an event id, so it is visible.
      const envelope = readPaddleEventEnvelope(payload);
      if (envelope === null) {
        this.logger.warn('Paddle webhook payload without event_id could not be mapped');
        return;
      }
      await this.storeErroredEvent(
        envelope.eventId,
        envelope.eventType ?? 'unknown',
        envelope.occurredAt ?? this.clock.now(),
        payload,
        'unmappable_payload',
      );
      return;
    }

    const orgId = this.parseOrgId(mapped.orgIdRaw);
    if (orgId === null) {
      await this.storeErroredEvent(mapped.eventId, mapped.eventType, mapped.occurredAt, payload);
      return;
    }
    // The org id comes from checkout custom_data, which the browser controls; only trust it
    // when it carries the signature our checkout endpoint issued for that org.
    if (!verifyCheckoutOrgId(this.env.JWT_ACCESS_SECRET, orgId, mapped.orgSigRaw)) {
      await this.storeErroredEvent(
        mapped.eventId,
        mapped.eventType,
        mapped.occurredAt,
        payload,
        'invalid_org_signature',
      );
      return;
    }

    const orgKnown = await withOrg(this.db, orgId, (tx) => this.billingRepo.orgExists(tx, orgId));
    if (!orgKnown) {
      await this.storeErroredEvent(mapped.eventId, mapped.eventType, mapped.occurredAt, payload);
      return;
    }

    if (mapped.kind === 'ignored') {
      await withOrg(this.db, orgId, async (tx) => {
        const claimed = await this.billingRepo.claimBillingEvent(tx, {
          providerEventId: mapped.eventId,
          type: mapped.eventType,
          occurredAt: mapped.occurredAt,
          payload,
        });
        if (claimed.processedAt !== null) {
          return;
        }
        await this.billingRepo.markBillingEventProcessed(
          tx,
          mapped.eventId,
          null,
          this.clock.now(),
        );
      });
      return;
    }

    if (mapped.kind === 'transaction') {
      await this.applyTransaction(orgId, mapped, payload);
      return;
    }

    if (mapped.priceId !== null && mapped.planId === null) {
      await this.storeErroredEvent(
        mapped.eventId,
        mapped.eventType,
        mapped.occurredAt,
        payload,
        'unknown_price_id',
      );
      return;
    }

    await this.applySubscription(orgId, mapped, payload);
  }

  private parseOrgId(raw: unknown): string | null {
    if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
      return null;
    }
    return raw;
  }

  private async storeErroredEvent(
    eventId: string,
    type: string,
    occurredAt: Date,
    payload: unknown,
    error = 'unknown_org',
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.billingRepo.insertProcessedBillingEventWithError(tx, {
        providerEventId: eventId,
        type,
        occurredAt,
        payload,
        error,
        processedAt: this.clock.now(),
      });
    });
    this.logger.warn(`Paddle webhook stored with error=${error} eventId=${eventId}`);
  }

  private async applyTransaction(
    orgId: string,
    mapped: MappedTransactionEvent,
    payload: unknown,
  ): Promise<void> {
    await withOrg(this.db, orgId, async (tx) => {
      const claimed = await this.billingRepo.claimBillingEvent(tx, {
        providerEventId: mapped.eventId,
        type: mapped.eventType,
        occurredAt: mapped.occurredAt,
        payload,
      });
      if (claimed.processedAt !== null) {
        return;
      }

      const sub = await this.billingRepo.findSubscriptionWithPlan(tx, orgId);
      if (
        sub !== null &&
        sub.providerCustomerId === null &&
        mapped.providerCustomerId !== null
      ) {
        await this.billingRepo.updateSubscription(tx, orgId, {
          providerCustomerId: mapped.providerCustomerId,
        });
      }

      await this.billingRepo.markBillingEventProcessed(
        tx,
        mapped.eventId,
        null,
        this.clock.now(),
      );
    });
  }

  private async applySubscription(
    orgId: string,
    mapped: MappedSubscriptionEvent,
    payload: unknown,
  ): Promise<void> {
    const entitlementsChanged = await withOrg(this.db, orgId, async (tx) => {
      const claimed = await this.billingRepo.claimBillingEvent(tx, {
        providerEventId: mapped.eventId,
        type: mapped.eventType,
        occurredAt: mapped.occurredAt,
        payload,
      });
      if (claimed.processedAt !== null) {
        return false;
      }

      const sub = await this.billingRepo.findSubscriptionWithPlan(tx, orgId);
      if (sub === null) {
        await this.billingRepo.markBillingEventProcessed(
          tx,
          mapped.eventId,
          'subscription_row_missing',
          this.clock.now(),
        );
        return false;
      }

      const now = this.clock.now();
      if (
        isLivePaddleSubscription(sub, now) &&
        sub.providerSubscriptionId !== null &&
        sub.providerSubscriptionId !== mapped.providerSubscriptionId
      ) {
        await this.billingRepo.markBillingEventProcessed(
          tx,
          mapped.eventId,
          'stray_provider_subscription_id',
          this.clock.now(),
        );
        this.logger.error(
          `Stray Paddle subscription id for org=${orgId} event=${mapped.providerSubscriptionId}`,
        );
        return false;
      }

      if (
        sub.providerEventAt !== null &&
        mapped.occurredAt.getTime() < sub.providerEventAt.getTime()
      ) {
        await this.billingRepo.markBillingEventProcessed(
          tx,
          mapped.eventId,
          null,
          this.clock.now(),
        );
        return false;
      }

      if (mapped.status === null) {
        await this.billingRepo.markBillingEventProcessed(
          tx,
          mapped.eventId,
          'unknown_status',
          this.clock.now(),
        );
        return false;
      }

      await this.billingRepo.updateSubscription(tx, orgId, {
        ...(mapped.planId !== null ? { planId: mapped.planId } : {}),
        status: mapped.status,
        provider: 'paddle',
        providerCustomerId: mapped.providerCustomerId,
        providerSubscriptionId: mapped.providerSubscriptionId,
        branchQuantity: mapped.branchQuantity,
        currentPeriodEnd: mapped.currentPeriodEnd,
        trialEndsAt: mapped.trialEndsAt,
        canceledAt: mapped.canceledAt,
        scheduledChange: mapped.scheduledChange,
        providerEventAt: mapped.occurredAt,
      });

      await this.billingRepo.markBillingEventProcessed(
        tx,
        mapped.eventId,
        null,
        this.clock.now(),
      );
      return true;
    });

    if (entitlementsChanged) {
      this.entitlements.invalidate(orgId);
      this.orgSettings.purgeMenuCache(orgId);
    }
  }
}
