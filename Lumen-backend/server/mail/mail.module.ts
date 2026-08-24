import { Module } from '@nestjs/common';
// @ts-ignore - IDE TS Server caching issue
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
