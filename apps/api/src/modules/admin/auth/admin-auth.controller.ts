import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { AdminCtx, type AdminContext } from '../admin-context';
import { AdminLoginBodyDto } from '../dto/admin-auth.dto';
import { AdminAuthService } from './admin-auth.service';

/**
 * Everything under /v1/admin is @Public() to the tenant AuthGuard (which only understands tenant
 * tokens) and protected by AdminAuthGuard instead.
 */
@Public()
@Controller('v1/admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('auth/login')
  login(
    @Body() body: AdminLoginBodyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(body, req, res);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('auth/refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }

  @Post('auth/logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }

  @UseGuards(AdminAuthGuard)
  @Get('me')
  me(@AdminCtx() admin: AdminContext) {
    return this.auth.me(admin);
  }

  @UseGuards(AdminAuthGuard)
  @Get('auth/me')
  meAlias(@AdminCtx() admin: AdminContext) {
    return this.auth.me(admin);
  }
}
