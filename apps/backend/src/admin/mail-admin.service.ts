import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { MailService } from '../mail/mail.service.js';
import type { SendEmailDto } from './dto/send-email.dto.js';

export interface SendEmailResult {
  recipients: number;
  sent: number;
  failed: number;
}

@Injectable()
export class MailAdminService {
  constructor(private readonly mail: MailService) {}

  // Sends one message per recipient, sequentially. Failures are counted, not thrown,
  // so one bad address doesn't stop the rest. Fine for this app's user count;
  // ponytail: move to a queue if the "all" audience grows past a few thousand users.
  async send(dto: SendEmailDto): Promise<SendEmailResult> {
    const recipients = await this.resolveRecipients(dto);

    let sent = 0;
    let failed = 0;
    for (const to of recipients) {
      try {
        await this.mail.send({ to, subject: dto.subject, text: dto.body });
        sent++;
      } catch {
        failed++;
      }
    }
    return { recipients: recipients.length, sent, failed };
  }

  private async resolveRecipients(dto: SendEmailDto): Promise<string[]> {
    if (dto.audience === 'all') {
      const users = await db.orm.public.User.where((u) => u.status.eq('active')).select('email').all();
      return users.map((u) => u.email);
    }
    const users = await Promise.all((dto.userIds ?? []).map((id) => db.orm.public.User.first({ id })));
    return users.filter((u) => u?.status === 'active').map((u) => u!.email);
  }
}
