import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { assertOwnerOrAdmin } from '../auth/assert-owner-or-admin.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { StatsService } from './stats.service.js';

type AuthedRequest = Request & { user: AuthenticatedUser };

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get(':userId')
  getStats(@Req() req: AuthedRequest, @Param('userId') userId: string) {
    // A user's stats are private to them — without this, any authenticated
    // user could read another user's stats just by changing the id in the URL.
    assertOwnerOrAdmin(req.user, userId);
    return this.statsService.getStats(userId);
  }
}
