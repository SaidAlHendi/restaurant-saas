import { type PipeTransform } from '@nestjs/common';

import { catalogPathIdSchema } from '@app/shared';

import { NotFoundError } from '../../../core/errors/app-errors';

/** Invalid order/table path ids return 404 (not 400). */
export class OrderingPathIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const parsed = catalogPathIdSchema.safeParse(value);
    if (!parsed.success) {
      throw new NotFoundError();
    }
    return parsed.data;
  }
}
