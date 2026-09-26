import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { CreateGameDto } from '../games/dto/create-game.dto.js';
import type { UpdateGameDto } from '../games/dto/update-game.dto.js';
import type { QueryAdminGamesDto } from './dto/query-admin-games.dto.js';
import type { PaginatedResult } from './pagination.js';

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

/** CRUD for games from the admin surface — GamesController/GamesService cover the public-facing routes (list, get, upload-rom); this adds the update/delete admin needs and its own create for the /admin namespace. */
@Injectable()
export class GamesAdminService {
  async findAll(query: QueryAdminGamesDto): Promise<PaginatedResult<Game>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? 'date';

    const collection = query.emulator
      ? db.orm.public.Game.where((g) => g.emulator.eq(query.emulator!))
      : db.orm.public.Game;

    if (sort === 'popularity') {
      // "Popularity" has no column to order by — it's derived from SaveGame
      // row counts per game — and the ORM can't order-by-related-count or
      // order a grouped aggregate by its own alias (see the prisma-8 skill's
      // queries-postgres.md, "What Prisma Next doesn't do yet"). Sort in JS.
      // Fine at this app's game-catalog scale; drop to db.sql if it grows.
      const [all, playCounts] = await Promise.all([
        collection.all(),
        db.orm.public.SaveGame.groupBy('gameId').aggregate((a) => ({ count: a.count() })),
      ]);
      const countByGame = new Map(playCounts.map((p) => [p.gameId, p.count]));
      const sorted = [...all].sort((a, b) => (countByGame.get(b.id) ?? 0) - (countByGame.get(a.id) ?? 0));
      const total = sorted.length;
      const start = (page - 1) * limit;
      return {
        data: sorted.slice(start, start + limit),
        meta: { total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
      };
    }

    const ordered =
      sort === 'rating' ? collection.orderBy((g) => g.rating.desc()) : collection.orderBy((g) => g.createdAt.desc());

    const [data, { total }] = await Promise.all([
      ordered.limit(limit).offset((page - 1) * limit).all(),
      collection.aggregate((a) => ({ total: a.count() })),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
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

  async update(id: string, dto: UpdateGameDto): Promise<Game> {
    await this.findOne(id); // 404s before issuing a no-op UPDATE against a missing row.
    await db.orm.public.Game.where((g) => g.id.eq(id)).update(dto);
    return this.findOne(id);
  }

  async updateRomPath(id: string, romPath: string): Promise<Game> {
    await this.findOne(id); // 404s before issuing a no-op UPDATE against a missing row.
    await db.orm.public.Game.where((g) => g.id.eq(id)).update({ romPath });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // 404s instead of silently no-op'ing a DELETE with no matching row.
    // Game -> SaveGame is `onDelete: Cascade` (contract.prisma), so a game's
    // save states are cleaned up by the database, not here.
    await db.orm.public.Game.where((g) => g.id.eq(id)).delete();
  }
}
