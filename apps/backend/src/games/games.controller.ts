import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import {
  assertImageSize,
  imageExtensionFor,
  imageFileFilter,
} from '../uploads/image-file-validation.js';
import { MAX_ROM_SIZE_BYTES, romFileFilter } from '../uploads/rom-file-validation.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import { QueryGamesDto } from './dto/query-games.dto.js';
import { UploadGameDto } from './dto/upload-game.dto.js';
import { GamesService } from './games.service.js';
import { romExtensionForEmulator } from './rom-file.util.js';

// One filter for the multi-file upload. The ROM extension is checked in the
// handler, not here: it depends on the `emulator` text field, which multipart
// parsing doesn't guarantee has arrived yet. Multer's fileSize limit is shared,
// so the ROM limit is the ceiling and images are capped by assertImageSize().
const gameUploadFileFilter: typeof romFileFilter = (req, file, callback) => {
  if (file.fieldname === 'rom') return callback(null, true);
  if (file.fieldname === 'cover' || file.fieldname === 'thumbnail') {
    return imageFileFilter(req, file, callback);
  }
  callback(new BadRequestException(`Unexpected file field "${file.fieldname}"`), false);
};

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

    // Generic, not a per-extension guess: ROM formats have no registered
    // IANA media type, and the frontend (useEmulator.ts) only ever reads the
    // response as raw bytes (`.arrayBuffer()`) — it doesn't branch on this.
    const safeName = game.title.replace(/[^a-z0-9.-]+/gi, '_');
    const options = {
      type: 'application/octet-stream',
      disposition: `attachment; filename="${safeName}${extension}"`,
    };

    // Uploaded ROMs are stored under "roms/<uuid><ext>" keys (see upload());
    // seeded games keep their placeholder file under ROMS_DIR, keyed by id.
    if (game.romPath.startsWith('roms/')) {
      try {
        return new StreamableFile(await this.uploadsService.openStored(game.romPath), options);
      } catch {
        throw new NotFoundException(`No ROM file found for game "${game.id}"`);
      }
    }

    const filePath = join(ROMS_DIR, `${game.id}${extension}`);
    try {
      await stat(filePath);
    } catch {
      throw new NotFoundException(`No ROM file found for game "${game.id}"`);
    }
    return new StreamableFile(createReadStream(filePath), options);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  // Creates a game from one multipart request: text fields + rom, cover and
  // thumbnail files. Everything is validated before anything is stored.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'rom', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: MAX_ROM_SIZE_BYTES },
        fileFilter: gameUploadFileFilter,
      },
    ),
  )
  async upload(
    @Body() dto: UploadGameDto,
    @UploadedFiles()
    files: { rom?: Express.Multer.File[]; cover?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] },
  ) {
    const rom = files.rom?.[0];
    const cover = files.cover?.[0];
    const thumbnail = files.thumbnail?.[0];
    if (!rom || !cover || !thumbnail) {
      throw new BadRequestException('rom, cover and thumbnail files are all required');
    }

    // Everything is checked before anything is stored.
    const romExtension = romExtensionForEmulator(dto.emulator);
    if (extname(rom.originalname).toLowerCase() !== romExtension) {
      throw new BadRequestException(
        `Unsupported ROM file type "${extname(rom.originalname).toLowerCase() || rom.originalname}" for "${dto.emulator}". Allowed: ${romExtension}`,
      );
    }
    assertImageSize(cover);
    assertImageSize(thumbnail);
    const coverExtension = imageExtensionFor(cover.mimetype);
    const thumbnailExtension = imageExtensionFor(thumbnail.mimetype);
    if (!coverExtension || !thumbnailExtension) {
      throw new BadRequestException('cover and thumbnail must be PNG, JPEG or WebP');
    }

    return this.uploadsService.storeAllOrNone(
      [
        { buffer: rom.buffer, extension: romExtension },
        { buffer: cover.buffer, extension: coverExtension },
        { buffer: thumbnail.buffer, extension: thumbnailExtension },
      ],
      ([romFile, coverFile, thumbnailFile]) =>
        this.gamesService.create({
          ...dto,
          romPath: romFile.path,
          cover: coverFile.url,
          thumbnail: thumbnailFile.url,
        }),
    );
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
