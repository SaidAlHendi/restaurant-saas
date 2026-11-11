import { Inject, Injectable, Logger } from '@nestjs/common';

import type { LeadCreateBody } from '@app/shared';

import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';

const REQUEST_TIMEOUT_MS = 5000;

/** The message people see in chat: who, where and how to reach them. The free-text message is left out. */
export function formatLeadNotification(lead: LeadCreateBody): string {
  const source = lead.attribution?.utm_source ?? lead.attribution?.referrer ?? 'direct';
  return [
    `New Sahtain lead: ${lead.restaurantName}`,
    `${lead.name} · ${lead.phone} · ${lead.email}`,
    `${lead.country} · ${String(lead.branches)} branch(es) · ${lead.locale} · ${source}`,
  ].join('\n');
}

/**
 * Tells a chat webhook about each new lead. Best effort: the lead is already saved, so a slow or
 * failing webhook is logged and never shown to the visitor. Without a configured URL it does nothing.
 */
@Injectable()
export class LeadNotifier {
  private readonly logger = new Logger(LeadNotifier.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async notify(lead: LeadCreateBody, fetchImpl: typeof fetch = fetch): Promise<void> {
    const url = this.env.LEADS_NOTIFY_WEBHOOK_URL;
    if (!url) {
      return;
    }
    const text = formatLeadNotification(lead);
    try {
      // `text` is read by Slack and Mattermost, `content` by Discord.
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, content: text }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`Lead notification webhook answered ${String(response.status)}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`Lead notification failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }
}
