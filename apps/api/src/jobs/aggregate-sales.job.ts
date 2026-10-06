import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AggregateSalesJob {
  private readonly logger = new Logger(AggregateSalesJob.name);

  tick(): void {
    this.logger.debug('aggregate sales stub');
  }
}
