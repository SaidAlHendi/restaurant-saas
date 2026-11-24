import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { OutboxService } from '../outbox/outbox.service';

import { DataChangedNotifier } from './data-changed.notifier';

/** Small on purpose, so feature modules (billing) can notify screens without importing CoreModule. */
@Module({
  imports: [DbModule],
  providers: [OutboxService, DataChangedNotifier],
  exports: [DataChangedNotifier],
})
export class DataChangedModule {}
