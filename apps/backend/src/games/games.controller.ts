import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { MAX_ROM_SIZE_BYTES, romFileFilter } from '../uploads/rom-file-validation.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import { QueryGamesDto } from './dto/query-games.dto.js';
import { GamesService } from './games.service.js';
import { romExtensionForEmulator } from './rom-file.util.js';

// Distinct from uploads/'s UPLOADS_DIR: that one holds files placed via the
// upload endpoints (arbitrary generated filenames); this one holds files
// this endpoint serves by deriving <gameId><extension> from the game record
// itself — see getRom() below.
const ROMS_DIR = process.env.ROMS_DIR ?? join(process.cwd(), 'public', 'roms');

@Controller('games')
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get()
  findAll(@Query() query: QueryGamesDto) {
    return this.gamesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':gameId/rom')
  async getRom(@Param('gameId') gameId: string): Promise<StreamableFile> {
    const game = await this.gamesService.findOne(gameId);
    const extension = romExtensionForEmulator(game.emulator);
    const filePath = join(ROMS_DIR, `${game.id}${extension}`);

    try {
      await stat(filePath);
    } catch {
      throw new NotFoundException(`No ROM file found for game "${game.id}"`);
    }

    // Generic, not a per-extension guess: ROM formats have no registered
    // IANA media type, and the frontend (useEmulator.ts) only ever reads the
    // response as raw bytes (`.arrayBuffer()`) — it doesn't branch on this.
    const safeName = game.title.replace(/[^a-z0-9.-]+/gi, '_');
    return new StreamableFile(createReadStream(filePath), {
      type: 'application/octet-stream',
      disposition: `attachment; filename="${safeName}${extension}"`,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':gameId/upload-rom')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ROM_SIZE_BYTES },
      fileFilter: romFileFilter,
    }),
  )
  async uploadRom(@Param('gameId') gameId: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded (expected multipart field "file")');
    }
    // Confirmed to exist before storing anything, so a bad gameId 404s
    // without leaving an orphaned file behind in the storage provider.
    await this.gamesService.findOne(gameId);
    const uploaded = await this.uploadsService.storeRom(file);
    return this.gamesService.updateRomPath(gameId, uploaded.url);
  }
}
