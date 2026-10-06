import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Public } from '../../core/auth/public.decorator';
import { AuthService } from './auth.service';
import { LoginBodyDto, SignupBodyDto, SwitchOrgBodyDto } from './dto/auth.dto';
import { Authenticated } from '../../core/auth/authenticated.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600_000 } })
  @Post('signup')
  signup(@Body() body: SignupBodyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.signup(body, req, res);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('login')
  login(@Body() body: LoginBodyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(body, req, res);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }

  @Public()
  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }

  @Authenticated()
  @Post('switch-org')
  switchOrg(
    @Ctx() ctx: RequestContext,
    @Body() body: SwitchOrgBodyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.switchOrg(ctx.userId, body, req, res);
  }
}
