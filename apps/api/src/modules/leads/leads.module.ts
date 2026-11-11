import { Module } from '@nestjs/common';

import { LeadNotifier } from './lead-notifier';
import { LeadsController } from './leads.controller';
import { LeadsRepository } from './leads.repository';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsRepository, LeadNotifier, LeadsService],
})
export class LeadsModule {}
