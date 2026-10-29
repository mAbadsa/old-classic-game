import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { UpdateGameDto } from '../games/dto/update-game.dto.js';
import { MAX_ROM_SIZE_BYTES, romFileFilter } from '../uploads/rom-file-validation.js';
import { MAX_IMAGE_SIZE_BYTES, imageFileFilter } from '../uploads/image-file-validation.js';
import { AdminService } from './admin.service.js';
import { CreateGameWithRomDto } from './dto/create-game-with-rom.dto.js';
import { QueryAdminGamesDto } from './dto/query-admin-games.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { QueryLogsDto } from './dto/query-logs.dto.js';
import { UpsertSettingDto } from './dto/upsert-setting.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import { SendEmailDto } from './dto/send-email.dto.js';

type AuthedRequest = Request & { user: AuthenticatedUser };

const imageUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: imageFileFilter,
});

const romUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_ROM_SIZE_BYTES },
  fileFilter: romFileFilter,
});

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Games
  @Get('games')
  listGames(@Query() query: QueryAdminGamesDto) {
    return this.adminService.listGames(query);
  }

  @Get('games/:id')
  getGame(@Param('id') id: string) {
    return this.adminService.getGame(id);
  }

  @Get('games/:id/stats')
  getGameStats(@Param('id') id: string) {
    return this.adminService.getGameStats(id);
  }

  @Post('games')
  @UseInterceptors(romUploadInterceptor)
  createGame(
    @Req() req: AuthedRequest,
    @Body() dto: CreateGameWithRomDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No ROM file uploaded (expected multipart field "file")');
    }
    return this.adminService.createGameWithRom(dto, file, req.user.id);
  }

  @Post('games/:id/upload-rom')
  @UseInterceptors(romUploadInterceptor)
  uploadRom(@Req() req: AuthedRequest, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No ROM file uploaded (expected multipart field "file")');
    }
    return this.adminService.replaceGameRom(id, file, req.user.id);
  }

  @Post('games/:id/images/:kind')
  @UseInterceptors(imageUploadInterceptor)
  uploadGameImage(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('kind') kind: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (kind !== 'cover' && kind !== 'thumbnail') {
      throw new BadRequestException('Image kind must be "cover" or "thumbnail"');
    }
    if (!file) {
      throw new BadRequestException('No image uploaded (expected multipart field "file")');
    }
    return this.adminService.uploadGameImage(id, kind, file, req.user.id);
  }

  @Put('games/:id')
  updateGame(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.adminService.updateGame(id, dto, req.user.id);
  }

  @Delete('games/:id')
  deleteGame(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.adminService.deleteGame(id, req.user.id);
  }

  // Users
  @Get('users')
  listUsers(@Query() query: QueryUsersDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  updateUserRole(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto.role, req.user.id);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto.status, req.user.id);
  }

  @Post('users/:id/force-logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  forceLogoutUser(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.adminService.forceLogoutUser(id, req.user.id);
  }

  @Delete('users/:id')
  deleteUser(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.adminService.deleteUser(id, req.user.id);
  }

  // Analytics
  @Get('analytics/overview')
  getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  @Get('analytics/top-games')
  getTopGames(@Query('limit') limit?: string) {
    return this.adminService.getTopGames(limit ? Number(limit) : undefined);
  }

  // Email
  @Post('emails')
  sendEmail(@Req() req: AuthedRequest, @Body() dto: SendEmailDto) {
    return this.adminService.sendEmail(dto, req.user.id);
  }

  // System
  @Get('logs')
  listLogs(@Query() query: QueryLogsDto) {
    return this.adminService.listLogs(query);
  }

  @Put('announcement')
  updateAnnouncement(@Req() req: AuthedRequest, @Body() dto: UpdateAnnouncementDto) {
    return this.adminService.updateAnnouncement(dto, req.user.id);
  }

  @Get('settings')
  listSettings() {
    return this.adminService.listSettings();
  }

  @Get('settings/:key')
  getSetting(@Param('key') key: string) {
    return this.adminService.getSetting(key);
  }

  @Put('settings/:key')
  upsertSetting(@Req() req: AuthedRequest, @Param('key') key: string, @Body() dto: UpsertSettingDto) {
    return this.adminService.upsertSetting(key, dto.value, req.user.id);
  }
}
