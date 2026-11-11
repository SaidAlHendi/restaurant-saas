import { Injectable } from '@nestjs/common';

import type { LeadCreateBody, LeadCreateResponse } from '@app/shared';

import { newUuidV7 } from '../../lib/uuid';

import { LeadsRepository } from './leads.repository';

@Injectable()
export class LeadsService {
  constructor(private readonly repository: LeadsRepository) {}

  async create(body: LeadCreateBody): Promise<LeadCreateResponse> {
    // Honeypot: a person never sees this field. Answer exactly as for a real lead so bots learn nothing.
    if (body.website !== undefined && body.website.trim() !== '') {
      return { ok: true };
    }
    const attribution = body.attribution ?? {};
    await this.repository.insert({
      id: newUuidV7(),
      name: body.name,
      restaurantName: body.restaurantName,
      phone: body.phone,
      email: body.email,
      country: body.country,
      branches: body.branches,
      locale: body.locale,
      message: body.message ?? null,
      utmSource: attribution.utm_source ?? null,
      utmMedium: attribution.utm_medium ?? null,
      utmCampaign: attribution.utm_campaign ?? null,
      utmTerm: attribution.utm_term ?? null,
      utmContent: attribution.utm_content ?? null,
      gclid: attribution.gclid ?? null,
      fbclid: attribution.fbclid ?? null,
      referrer: attribution.referrer ?? null,
      landingPath: attribution.landingPath ?? null,
    });
    return { ok: true };
  }
}
