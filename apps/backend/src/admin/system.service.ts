import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { QueryLogsDto } from './dto/query-logs.dto.js';
import type { PaginatedResult } from './pagination.js';

export interface AdminLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface SystemSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface LogInput {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: unknown;
}

/** Admin audit log + a key/value settings store. "System logs" here means the admin action trail (AdminLog) — this app has no application/request logging infra to surface instead. */
@Injectable()
export class SystemService {
  log(input: LogInput): Promise<AdminLogEntry> {
    return db.orm.public.AdminLog.create({
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      // metadata is arbitrary caller-supplied JSON — the contract's Json
      // column type is stricter than `unknown`, so this is a deliberate cast.
      metadata: (input.metadata ?? null) as any,
    });
  }

  async listLogs(query: QueryLogsDto): Promise<PaginatedResult<AdminLogEntry>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [data, { total }] = await Promise.all([
      db.orm.public.AdminLog.orderBy((l) => l.createdAt.desc())
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      db.orm.public.AdminLog.aggregate((a) => ({ total: a.count() })),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    };
  }

  async listSettings(): Promise<SystemSetting[]> {
    return db.orm.public.SystemSetting.orderBy((s) => s.key.asc()).all();
  }

  async getSetting(key: string): Promise<SystemSetting> {
    const setting = await db.orm.public.SystemSetting.first({ key });
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }
    return setting;
  }

  upsertSetting(key: string, value: unknown): Promise<SystemSetting> {
    // value is arbitrary caller-supplied JSON — see the same cast in log() above.
    return db.orm.public.SystemSetting.upsert({
      create: { key, value: value as any },
      update: { value: value as any },
    });
  }
}
