import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../../core/auth/public.decorator';

import { CreateLeadDto } from './dto/leads.dto';
import { LeadsService } from './leads.service';

/**
 * Public contact form, called server-to-server by apps/site. This API has no `trust proxy`, so the
 * throttler sees the site server's address, not the visitor's: the limit below is a safety net for the
 * whole site. Per-visitor limiting lives in the site's form action and at the CDN.
 * The response is never cached.
 */
@Public()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('v1/public/leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  create(@Body() body: CreateLeadDto) {
    return this.leads.create(body);
  }
}
