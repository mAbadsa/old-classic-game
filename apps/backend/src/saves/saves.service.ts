import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { CreateSaveDto } from './dto/create-save.dto.js';
import type { UpdateSaveDto } from './dto/update-save.dto.js';

export interface SaveResponse {
  id: string;
  userId: string;
  gameId: string;
  saveState: string; // base64
  playTime: number;
  screenshot: string | null;
  slotNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface SaveRow {
  id: string;
  userId: string;
  gameId: string;
  saveState: Uint8Array;
  playTime: number;
  screenshot: string | null;
  slotNumber: number;
  createdAt: string;
  updatedAt: string;
}

function toResponse(row: SaveRow): SaveResponse {
  return { ...row, saveState: Buffer.from(row.saveState).toString('base64') };
}

function isUniqueViolation(err: unknown): err is { sqlState: string } {
  return typeof err === 'object' && err !== null && String((err as { sqlState?: unknown }).sqlState) === '23505';
}

function isForeignKeyViolation(err: unknown): err is { sqlState: string } {
  return typeof err === 'object' && err !== null && String((err as { sqlState?: unknown }).sqlState) === '23503';
}

@Injectable()
export class SavesService {
  async findOne(id: string): Promise<SaveResponse> {
    const row = await db.orm.public.SaveGame.first({ id });
    if (!row) {
      throw new NotFoundException(`Save with id "${id}" not found`);
    }
    return toResponse(row);
  }

  async findByUser(userId: string): Promise<SaveResponse[]> {
    const rows = await db.orm.public.SaveGame.where({ userId })
      .orderBy((s) => s.updatedAt.desc())
      .all();
    return rows.map(toResponse);
  }

  /** Scoped to `userId` — save data is per-user, so "saves for this game" means the caller's own. */
  async findByGameForUser(gameId: string, userId: string): Promise<SaveResponse[]> {
    const rows = await db.orm.public.SaveGame.where({ gameId, userId })
      .orderBy((s) => s.slotNumber.asc())
      .all();
    return rows.map(toResponse);
  }

  async create(userId: string, dto: CreateSaveDto): Promise<SaveResponse> {
    try {
      const row = await db.orm.public.SaveGame.create({
        userId,
        gameId: dto.gameId,
        saveState: Buffer.from(dto.saveState, 'base64'),
        slotNumber: dto.slotNumber,
        playTime: dto.playTime ?? 0,
        screenshot: dto.screenshot ?? null,
      });
      return toResponse(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A save already exists in slot ${dto.slotNumber} for this game — use PUT to update it`,
        );
      }
      if (isForeignKeyViolation(err)) {
        throw new BadRequestException('gameId does not refer to an existing game');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateSaveDto): Promise<SaveResponse> {
    await this.findOne(id); // 404s if missing; also the ownership-check anchor in the controller.

    await db.orm.public.SaveGame.where({ id }).update({
      ...(dto.saveState !== undefined && { saveState: Buffer.from(dto.saveState, 'base64') }),
      ...(dto.playTime !== undefined && { playTime: dto.playTime }),
      ...(dto.screenshot !== undefined && { screenshot: dto.screenshot }),
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // 404s if missing.
    await db.orm.public.SaveGame.where({ id }).delete();
  }
}
