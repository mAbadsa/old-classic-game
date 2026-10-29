import { Module } from '@nestjs/common';
import { AnnouncementController } from './announcement.controller.js';

@Module({
  controllers: [AnnouncementController],
})
export class AnnouncementModule {}
