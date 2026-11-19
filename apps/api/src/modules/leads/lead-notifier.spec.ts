import type { LeadCreateBody } from '@app/shared';

import type { Env } from '../../config/env';

import {
  formatLeadEmail,
  formatLeadNotification,
  formatLeadSubject,
  LeadNotifier,
  parseRecipients,
} from './lead-notifier';

const lead: LeadCreateBody = {
  name: 'Sara Al-Qahtani',
  restaurantName: 'Qahwa House',
  phone: '+966501234567',
  email: 'sara@example.com',
  country: 'SA',
  branches: 2,
  locale: 'ar',
  message: 'Please call after 5pm',
  attribution: { utm_source: 'google' },
};

const notifierWith = (url?: string, extra: Partial<Env> = {}) =>
  new LeadNotifier({ LEADS_NOTIFY_WEBHOOK_URL: url, ...extra } as Env);

const emailEnv: Partial<Env> = {
  RESEND_API_KEY: 're_test',
  LEADS_NOTIFY_EMAIL_TO: 'hello@getsahtain.com, owner@example.com',
  LEADS_NOTIFY_EMAIL_FROM: 'Sahtain <leads@getsahtain.com>',
};

describe('formatLeadNotification', () => {
  it('names the restaurant, contact details and source, but not the free-text message', () => {
    const text = formatLeadNotification(lead);
    expect(text).toContain('Qahwa House');
    expect(text).toContain('+966501234567');
    expect(text).toContain('sara@example.com');
    expect(text).toContain('google');
    expect(text).not.toContain('after 5pm');
  });

  it('shows "direct" when the visitor has no campaign or referrer', () => {
    expect(formatLeadNotification({ ...lead, attribution: undefined })).toContain('direct');
  });
});

describe('LeadNotifier', () => {
  it('does nothing without a webhook URL', async () => {
    const fetchMock = jest.fn();
    await notifierWith().notify(lead, fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the message as JSON to the webhook', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await notifierWith('https://hooks.example.com/x').notify(lead, fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://hooks.example.com/x');
    const sent = JSON.parse(init.body as string) as { text: string; content: string };
    expect(sent.text).toBe(sent.content);
    expect(sent.text).toContain('Qahwa House');
  });

  it('never throws when the webhook is down or answers an error', async () => {
    await expect(
      notifierWith('https://hooks.example.com/x').notify(lead, jest.fn().mockRejectedValue(new Error('boom'))),
    ).resolves.toBeUndefined();
    await expect(
      notifierWith('https://hooks.example.com/x').notify(
        lead,
        jest.fn().mockResolvedValue({ ok: false, status: 500 }),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('email helpers', () => {
  it('puts the visitor message in the email body only', () => {
    expect(formatLeadEmail(lead)).toContain('Please call after 5pm');
    expect(formatLeadEmail({ ...lead, message: undefined })).not.toContain('Message:');
  });

  it('keeps the subject on one line', () => {
    expect(formatLeadSubject({ ...lead, restaurantName: 'Qahwa\r\nBcc: x@evil.com' })).not.toMatch(/[\r\n]/);
  });

  it('splits recipients and drops empty entries', () => {
    expect(parseRecipients(' a@x.com, ,b@x.com,')).toEqual(['a@x.com', 'b@x.com']);
    expect(parseRecipients(undefined)).toEqual([]);
  });
});

describe('LeadNotifier email', () => {
  it('sends nothing without a key or recipients', async () => {
    const fetchMock = jest.fn();
    await notifierWith(undefined, { RESEND_API_KEY: 're_test' }).notify(lead, fetchMock);
    await notifierWith(undefined, { LEADS_NOTIFY_EMAIL_TO: 'a@x.com' }).notify(lead, fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the email to Resend with the key, recipients and a reply-to', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await notifierWith(undefined, emailEnv).notify(lead, fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer re_test');
    const sent = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sent['to']).toEqual(['hello@getsahtain.com', 'owner@example.com']);
    expect(sent['from']).toBe('Sahtain <leads@getsahtain.com>');
    expect(sent['reply_to']).toBe('sara@example.com');
    expect(sent['subject']).toBe('New Sahtain lead: Qahwa House');
  });

  it('uses both channels when both are configured, and a failing one does not stop the other', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('resend down'))
      .mockResolvedValue({ ok: true, status: 200 });
    await expect(
      notifierWith('https://hooks.example.com/x', emailEnv).notify(lead, fetchMock),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
