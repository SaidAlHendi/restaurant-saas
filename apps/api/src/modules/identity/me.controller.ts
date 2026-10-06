import { Controller, Get } from '@nestjs/common';

import { Authenticated } from '../../core/auth/authenticated.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { MeService } from './me.service';

@Controller('v1')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Authenticated()
  @Get('me')
  getMe(@Ctx() ctx: RequestContext) {
    return this.me.getMe(ctx);
  }
}
