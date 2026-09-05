import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { GamesModule } from './games/games.module.js';

@Module({
  imports: [AuthModule, GamesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
