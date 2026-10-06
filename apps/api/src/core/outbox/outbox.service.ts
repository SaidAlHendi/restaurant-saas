import { Injectable } from '@nestjs/common';

/** Stub — writes outbox rows inside transactions in later milestones. */
@Injectable()
export class OutboxService {
  write(): void {
    // no-op
  }
}
