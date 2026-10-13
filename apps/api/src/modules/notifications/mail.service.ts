import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendInvite(input: { to: string; inviteUrl: string; orgName: string }): void {
    this.logger.log(
      `Invite email (log driver): to=${input.to} org=${input.orgName} url=${input.inviteUrl}`,
    );
  }
}
