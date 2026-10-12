import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';

import { ValidationError } from '../../core/errors/app-errors';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';

import { PatchOrgSettingsBodyDto } from './dto/org-settings.dto';
import { OrgSettingsService } from './org-settings.service';

const upload = memoryStorage();
const maxImageBytes = 5 * 1024 * 1024;

@Controller('v1/org')
export class OrgSettingsController {
  constructor(private readonly orgSettings: OrgSettingsService) {}

  @RequirePermission('org.manage')
  @Get('settings')
  getSettings(@Ctx() ctx: RequestContext) {
    return this.orgSettings.getSettings(ctx);
  }

  @RequirePermission('org.manage')
  @Patch('settings')
  patchSettings(@Ctx() ctx: RequestContext, @Body() body: PatchOrgSettingsBodyDto) {
    return this.orgSettings.patchSettings(ctx, body);
  }

  @RequirePermission('org.manage')
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: upload,
      limits: { fileSize: maxImageBytes, files: 1 },
    }),
  )
  uploadLogo(
    @Ctx() ctx: RequestContext,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new ValidationError('File is required');
    }
    return this.orgSettings.uploadLogo(ctx, file);
  }

  @RequirePermission('org.manage')
  @Delete('logo')
  deleteLogo(@Ctx() ctx: RequestContext) {
    return this.orgSettings.deleteLogo(ctx);
  }
}
