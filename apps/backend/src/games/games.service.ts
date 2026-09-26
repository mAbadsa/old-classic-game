import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { CreateGameDto } from './dto/create-game.dto.js';
import type { QueryGamesDto } from './dto/query-games.dto.js';

export interface Game {
  id: string;
  title: string;
  emulator: string;
  romPath: string;
  cover: string | null;
  description: string | null;
  releaseYear: number | null;
  rating: number | null;
  tags: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class GamesService {
  async findAll(query: QueryGamesDto): Promise<PaginatedResult<Game>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const collection = query.emulator
      ? db.orm.public.Game.where((g) => g.emulator.eq(query.emulator!))
      : db.orm.public.Game;

    const [data, { total }] = await Promise.all([
      collection
        .orderBy((g) => g.createdAt.desc())
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      collection.aggregate((a) => ({ total: a.count() })),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Game> {
    const game = await db.orm.public.Game.first({ id });
    if (!game) {
      throw new NotFoundException(`Game with id "${id}" not found`);
    }
    return game;
  }

  create(dto: CreateGameDto): Promise<Game> {
    return db.orm.public.Game.create({
      title: dto.title,
      emulator: dto.emulator,
      romPath: dto.romPath,
      cover: dto.cover ?? null,
      description: dto.description ?? null,
      releaseYear: dto.releaseYear ?? null,
      rating: dto.rating ?? 0,
      tags: dto.tags ?? null,
    });
  }

  async updateRomPath(id: string, romPath: string): Promise<Game> {
    await db.orm.public.Game.where((g) => g.id.eq(id)).update({ romPath });
    // Re-fetch rather than trust .update()'s own return shape — this also
    // gives a clean 404 (via findOne) if `id` didn't match any row, instead
    // of silently no-op'ing the way a bare UPDATE would.
    return this.findOne(id);
  }
}
