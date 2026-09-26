import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { GamesAdminService } from './games-admin.service.js';
import { UsersAdminService } from './users-admin.service.js';
import { AnalyticsService } from './analytics.service.js';
import { SystemService } from './system.service.js';

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [AdminController],
  providers: [AdminService, GamesAdminService, UsersAdminService, AnalyticsService, SystemService],
})
export class AdminModule {}
