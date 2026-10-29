import { BadRequestException, Injectable } from '@nestjs/common';
import type { UpdateGameDto } from '../games/dto/update-game.dto.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { GamesAdminService, type Game, type GameImageKind } from './games-admin.service.js';
import { UsersAdminService, type SafeUser } from './users-admin.service.js';
import { AnalyticsService, type AnalyticsOverview, type GameStats, type TopGame } from './analytics.service.js';
import { SystemService, type AdminLogEntry, type SystemSetting } from './system.service.js';
import type { CreateGameWithRomDto } from './dto/create-game-with-rom.dto.js';
import type { QueryAdminGamesDto } from './dto/query-admin-games.dto.js';
import type { QueryUsersDto } from './dto/query-users.dto.js';
import type { QueryLogsDto } from './dto/query-logs.dto.js';
import { ANNOUNCEMENT_KEY, type UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import type { PaginatedResult } from './pagination.js';
import type { SendEmailDto } from './dto/send-email.dto.js';
import { MailAdminService, type SendEmailResult } from './mail-admin.service.js';

/**
 * Orchestrates the four admin sub-services and is the one thing the
 * audit log doesn't apply to itself: every mutation here is wrapped with an
 * AdminLog entry via SystemService, so the sub-services stay focused on
 * their own CRUD and don't each need to know about logging.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly gamesAdmin: GamesAdminService,
    private readonly usersAdmin: UsersAdminService,
    private readonly analytics: AnalyticsService,
    private readonly system: SystemService,
    private readonly uploads: UploadsService,
    private readonly mailAdmin: MailAdminService,
  ) {}

  // Games
  listGames(query: QueryAdminGamesDto): Promise<PaginatedResult<Game>> {
    return this.gamesAdmin.findAll(query);
  }

  getGame(id: string): Promise<Game> {
    return this.gamesAdmin.findOne(id);
  }

  async createGameWithRom(dto: CreateGameWithRomDto, file: Express.Multer.File, actorId: string): Promise<Game> {
    const uploaded = await this.uploads.storeRom(file);
    const game = await this.gamesAdmin.create({
      title: dto.title,
      emulator: dto.emulator,
      romPath: uploaded.url,
      cover: dto.cover,
      description: dto.description,
      releaseYear: dto.releaseYear,
      rating: dto.rating,
    });
    await this.system.log({
      actorId,
      action: 'game.create',
      targetType: 'game',
      targetId: game.id,
      metadata: { romFilename: uploaded.filename, romSize: uploaded.size },
    });
    return game;
  }

  async replaceGameRom(id: string, file: Express.Multer.File, actorId: string): Promise<Game> {
    await this.gamesAdmin.findOne(id); // 404s before storing anything, avoids an orphaned upload.
    const uploaded = await this.uploads.storeRom(file);
    const game = await this.gamesAdmin.updateRomPath(id, uploaded.url);
    await this.system.log({
      actorId,
      action: 'game.rom.replace',
      targetType: 'game',
      targetId: id,
      metadata: { romFilename: uploaded.filename, romSize: uploaded.size },
    });
    return game;
  }

  async uploadGameImage(id: string, kind: GameImageKind, file: Express.Multer.File, actorId: string): Promise<Game> {
    await this.gamesAdmin.findOne(id); // 404s before storing anything, avoids an orphaned upload.
    const saved = await this.uploads.storeImage(file);
    const game = await this.gamesAdmin.updateImage(id, kind, saved.url);
    await this.system.log({
      actorId,
      action: `game.${kind}.replace`,
      targetType: 'game',
      targetId: id,
      metadata: { filename: file.originalname, size: file.size },
    });
    return game;
  }

  async updateGame(id: string, dto: UpdateGameDto, actorId: string): Promise<Game> {
    const game = await this.gamesAdmin.update(id, dto);
    await this.system.log({
      actorId,
      action: 'game.update',
      targetType: 'game',
      targetId: id,
      metadata: dto,
    });
    return game;
  }

  async deleteGame(id: string, actorId: string): Promise<void> {
    await this.gamesAdmin.remove(id);
    await this.system.log({ actorId, action: 'game.delete', targetType: 'game', targetId: id });
  }

  // Users
  listUsers(query: QueryUsersDto): Promise<PaginatedResult<SafeUser>> {
    return this.usersAdmin.findAll(query);
  }

  getUser(id: string): Promise<SafeUser> {
    return this.usersAdmin.findOne(id);
  }

  async updateUserRole(id: string, role: string, actorId: string): Promise<SafeUser> {
    if (id === actorId && role !== 'admin') {
      throw new BadRequestException("You can't remove your own admin role");
    }
    const user = await this.usersAdmin.updateRole(id, role);
    await this.system.log({
      actorId,
      action: 'user.role.update',
      targetType: 'user',
      targetId: id,
      metadata: { role },
    });
    return user;
  }

  async updateUserStatus(id: string, status: string, actorId: string): Promise<SafeUser> {
    if (id === actorId && status !== 'active') {
      throw new BadRequestException("You can't suspend your own account");
    }
    const user = await this.usersAdmin.updateStatus(id, status);
    await this.system.log({
      actorId,
      action: 'user.status.update',
      targetType: 'user',
      targetId: id,
      metadata: { status },
    });
    return user;
  }

  async forceLogoutUser(id: string, actorId: string): Promise<void> {
    await this.usersAdmin.forceLogout(id);
    await this.system.log({ actorId, action: 'user.force_logout', targetType: 'user', targetId: id });
  }

  async deleteUser(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new BadRequestException("You can't delete your own account from the admin panel");
    }
    await this.usersAdmin.remove(id);
    await this.system.log({ actorId, action: 'user.delete', targetType: 'user', targetId: id });
  }

  // Site banner (stored as the "announcement" setting; read publicly via GET /announcement)
  async updateAnnouncement(dto: UpdateAnnouncementDto, actorId: string): Promise<SystemSetting> {
    const setting = await this.system.upsertSetting(ANNOUNCEMENT_KEY, dto);
    await this.system.log({
      actorId,
      action: 'announcement.update',
      targetType: 'setting',
      targetId: ANNOUNCEMENT_KEY,
      metadata: { active: dto.active, tone: dto.tone },
    });
    return setting;
  }

  // Email
  async sendEmail(dto: SendEmailDto, actorId: string): Promise<SendEmailResult> {
    const result = await this.mailAdmin.send(dto);
    await this.system.log({
      actorId,
      action: 'email.send',
      targetType: 'email',
      metadata: { audience: dto.audience, subject: dto.subject, ...result },
    });
    return result;
  }

  // Analytics
  getAnalyticsOverview(): Promise<AnalyticsOverview> {
    return this.analytics.getOverview();
  }

  getTopGames(limit?: number): Promise<TopGame[]> {
    return this.analytics.getTopGames(limit);
  }

  getGameStats(gameId: string): Promise<GameStats> {
    return this.analytics.getGameStats(gameId);
  }

  // System
  listLogs(query: QueryLogsDto): Promise<PaginatedResult<AdminLogEntry>> {
    return this.system.listLogs(query);
  }

  listSettings(): Promise<SystemSetting[]> {
    return this.system.listSettings();
  }

  getSetting(key: string): Promise<SystemSetting> {
    return this.system.getSetting(key);
  }

  async upsertSetting(key: string, value: unknown, actorId: string): Promise<SystemSetting> {
    const setting = await this.system.upsertSetting(key, value);
    await this.system.log({ actorId, action: 'setting.upsert', targetType: 'setting', targetId: key });
    return setting;
  }
}
