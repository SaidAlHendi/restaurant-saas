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

/** The email body: the chat summary plus what the visitor wrote, so the team can answer without opening the database. */
export function formatLeadEmail(lead: LeadCreateBody): string {
  const message = lead.message ? `\n\nMessage:\n${lead.message}` : '';
  return `${formatLeadNotification(lead)}${message}`;
}

/** Email subject: one line, whatever the visitor typed. */
export function formatLeadSubject(lead: LeadCreateBody): string {
  return `New Sahtain lead: ${lead.restaurantName}`.replace(/\s+/g, ' ').trim();
}

/** Comma separated recipients from the environment, empty entries dropped. */
export function parseRecipients(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

/**
 * Tells the team about each new lead by email (Resend) and, if configured, in a chat webhook.
 * Best effort: the lead is already saved, so a slow or failing channel is logged and never shown to
 * the visitor. A channel without its settings does nothing.
 */
@Injectable()
export class LeadNotifier {
  private readonly logger = new Logger(LeadNotifier.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async notify(lead: LeadCreateBody, fetchImpl: typeof fetch = fetch): Promise<void> {
    await Promise.all([this.sendEmail(lead, fetchImpl), this.sendWebhook(lead, fetchImpl)]);
  }

  private async sendEmail(lead: LeadCreateBody, fetchImpl: typeof fetch): Promise<void> {
    const apiKey = this.env.RESEND_API_KEY;
    const to = parseRecipients(this.env.LEADS_NOTIFY_EMAIL_TO);
    if (!apiKey || to.length === 0) {
      return;
    }
    await this.post('Lead email', fetchImpl, 'https://api.resend.com/emails', {
      headers: { authorization: `Bearer ${apiKey}` },
      body: {
        from: this.env.LEADS_NOTIFY_EMAIL_FROM,
        to,
        subject: formatLeadSubject(lead),
        text: formatLeadEmail(lead),
        // Replying to the notification writes to the visitor.
        reply_to: lead.email,
      },
    });
  }

  private async sendWebhook(lead: LeadCreateBody, fetchImpl: typeof fetch): Promise<void> {
    const url = this.env.LEADS_NOTIFY_WEBHOOK_URL;
    if (!url) {
      return;
    }
    const text = formatLeadNotification(lead);
    // `text` is read by Slack and Mattermost, `content` by Discord.
    await this.post('Lead webhook', fetchImpl, url, { body: { text, content: text } });
  }

  private async post(
    label: string,
    fetchImpl: typeof fetch,
    url: string,
    request: { headers?: Record<string, string>; body: unknown },
  ): Promise<void> {
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...request.headers },
        body: JSON.stringify(request.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`${label} answered ${String(response.status)}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`${label} failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }
}
