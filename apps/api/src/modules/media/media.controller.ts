import { Controller, Get, Inject, NotFoundException, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';

import { Public } from '../../core/auth/public.decorator';
import { ENV, type Env } from '../../config/config.module';

@Controller('v1/media')
export class MediaController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Public()
  @Get('*')
  serve(@Req() req: Request, @Res() res: Response) {
    if (this.env.NODE_ENV === 'production' || this.env.STORAGE_DRIVER !== 'local') {
      throw new NotFoundException();
    }
    const prefix = '/v1/media/';
    const idx = req.path.indexOf(prefix);
    const relative =
      idx >= 0 ? req.path.slice(idx + prefix.length) : req.path.replace(/^\//, '');
    if (relative.includes('..') || relative.includes('\\')) {
      throw new NotFoundException();
    }
    const root = this.env.STORAGE_LOCAL_ROOT ?? path.join(process.cwd(), '.storage');
    const filePath = path.join(root, relative);
    const resolved = path.resolve(filePath);
    const resolvedRoot = path.resolve(root);
    if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
      throw new NotFoundException();
    }
    if (!fs.existsSync(resolved)) {
      throw new NotFoundException();
    }
    res.type('image/webp');
    createReadStream(resolved).pipe(res);
  }
}
