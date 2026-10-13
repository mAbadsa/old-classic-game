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
  status: string;
  createdAt: string;
  updatedAt: string;
}

const SAFE_USER_FIELDS = ['id', 'email', 'username', 'avatar', 'role', 'status', 'createdAt', 'updatedAt'] as const;

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

  async updateStatus(id: string, status: string): Promise<SafeUser> {
    await this.findOne(id);
    await db.orm.public.User.where((u) => u.id.eq(id)).update({ status });
    if (status !== 'active') {
      await this.forceLogout(id); // Suspension also ends any sessions already open.
    }
    return this.findOne(id);
  }

  // Bumping tokenVersion makes every JWT issued so far fail validation (see JwtStrategy).
  async forceLogout(id: string): Promise<void> {
    const user = await db.orm.public.User.first({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    await db.orm.public.User.where((u) => u.id.eq(id)).update({ tokenVersion: user.tokenVersion + 1 });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // 404s instead of silently no-op'ing a DELETE with no matching row.
    // User -> SaveGame/UserAchievement/Session are all `onDelete: Cascade`
    // (contract.prisma), so a user's dependent rows are cleaned up by the
    // database, not here.
    await db.orm.public.User.where((u) => u.id.eq(id)).delete();
  }
}
