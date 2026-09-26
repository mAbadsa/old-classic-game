import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { assertOwnerOrAdmin } from '../auth/assert-owner-or-admin.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { CreateSaveDto } from './dto/create-save.dto.js';
import { UpdateSaveDto } from './dto/update-save.dto.js';
import { SavesService } from './saves.service.js';

type AuthedRequest = Request & { user: AuthenticatedUser };

@UseGuards(JwtAuthGuard)
@Controller('saves')
export class SavesController {
  constructor(private readonly savesService: SavesService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateSaveDto) {
    // userId comes from the authenticated session, never the request body —
    // otherwise any caller could create saves under someone else's account.
    return this.savesService.create(req.user.id, dto);
  }

  @Get('user/:userId')
  findByUser(@Req() req: AuthedRequest, @Param('userId') userId: string) {
    assertOwnerOrAdmin(req.user, userId);
    return this.savesService.findByUser(userId);
  }

  @Get('game/:gameId')
  findByGame(@Req() req: AuthedRequest, @Param('gameId') gameId: string) {
    // Always the caller's own saves for this game — there's no userId in
    // this route to authorize against, so it's scoped implicitly instead.
    return this.savesService.findByGameForUser(gameId, req.user.id);
  }

  @Put(':saveId')
  async update(@Req() req: AuthedRequest, @Param('saveId') saveId: string, @Body() dto: UpdateSaveDto) {
    const existing = await this.savesService.findOne(saveId);
    assertOwnerOrAdmin(req.user, existing.userId);
    return this.savesService.update(saveId, dto);
  }

  @Delete(':saveId')
  async remove(@Req() req: AuthedRequest, @Param('saveId') saveId: string) {
    const existing = await this.savesService.findOne(saveId);
    assertOwnerOrAdmin(req.user, existing.userId);
    await this.savesService.remove(saveId);
    return { success: true };
  }
}
