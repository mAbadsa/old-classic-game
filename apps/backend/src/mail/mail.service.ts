import { Injectable, Logger } from '@nestjs/common';

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

// MAIL_DRIVER=log (default) only logs the message. MAIL_DRIVER=resend sends it
// through Resend's HTTP API using MAIL_API_KEY. Switch once a real key is in .env.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(email: OutgoingEmail): Promise<void> {
    if (process.env.MAIL_DRIVER !== 'resend') {
      this.logger.log(`[mail:log] to=${email.to} subject="${email.subject}" (not delivered)`);
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MAIL_API_KEY ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? 'Old Classic Game <onboarding@resend.dev>',
        to: [email.to],
        subject: email.subject,
        text: email.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Mail provider responded ${res.status}: ${await res.text()}`);
    }
  }
}
