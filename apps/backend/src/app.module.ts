import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { GamesModule } from './games/games.module.js';
import { SavesModule } from './saves/saves.module.js';
import { StatsModule } from './stats/stats.module.js';
import { UploadsModule } from './uploads/uploads.module.js';

@Module({
  imports: [AuthModule, GamesModule, UploadsModule, SavesModule, StatsModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
