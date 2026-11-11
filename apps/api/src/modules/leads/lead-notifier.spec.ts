import type { LeadCreateBody } from '@app/shared';

import type { Env } from '../../config/env';

import { formatLeadNotification, LeadNotifier } from './lead-notifier';

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

const notifierWith = (url?: string) =>
  new LeadNotifier({ LEADS_NOTIFY_WEBHOOK_URL: url } as Env);

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
