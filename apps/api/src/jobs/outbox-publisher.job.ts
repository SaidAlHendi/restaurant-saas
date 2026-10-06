import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OutboxPublisherJob {
  private readonly logger = new Logger(OutboxPublisherJob.name);

  tick(): void {
    this.logger.debug('outbox publisher stub');
  }
}
