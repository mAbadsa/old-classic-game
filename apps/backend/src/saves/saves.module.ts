import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SavesController } from './saves.controller.js';
import { SavesService } from './saves.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SavesController],
  providers: [SavesService],
})
export class SavesModule {}
