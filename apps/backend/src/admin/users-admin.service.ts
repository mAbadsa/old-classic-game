import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { QueryUsersDto } from './dto/query-users.dto.js';
import type { PaginatedResult } from './pagination.js';

/** Never carries passwordHash — admin reads go through this shape, not the auth module's `User`. */
export interface SafeUser {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const SAFE_USER_FIELDS = ['id', 'email', 'username', 'avatar', 'role', 'createdAt', 'updatedAt'] as const;

@Injectable()
export class UsersAdminService {
  async findAll(query: QueryUsersDto): Promise<PaginatedResult<SafeUser>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const collection = query.role
      ? db.orm.public.User.where((u) => u.role.eq(query.role!))
      : db.orm.public.User;

    const [data, { total }] = await Promise.all([
      collection
        .select(...SAFE_USER_FIELDS)
        .orderBy((u) => u.createdAt.desc())
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      collection.aggregate((a) => ({ total: a.count() })),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await db.orm.public.User.select(...SAFE_USER_FIELDS).first({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  async updateRole(id: string, role: string): Promise<SafeUser> {
    await this.findOne(id); // 404s before issuing a no-op UPDATE against a missing row.
    await db.orm.public.User.where((u) => u.id.eq(id)).update({ role });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // 404s instead of silently no-op'ing a DELETE with no matching row.
    // User -> SaveGame/UserAchievement/Session are all `onDelete: Cascade`
    // (contract.prisma), so a user's dependent rows are cleaned up by the
    // database, not here.
    await db.orm.public.User.where((u) => u.id.eq(id)).delete();
  }
}
