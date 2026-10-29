import { ConflictException, Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatar: string | null;
  role: string;
  status: string;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
}

function isUniqueViolation(err: unknown): err is { sqlState: string; constraint?: string } {
  return typeof err === 'object' && err !== null && String((err as any).sqlState) === '23505';
}

@Injectable()
export class UsersService {
  findByEmail(email: string): Promise<User | null> {
    return db.orm.public.User.where((u) => u.email.eq(email)).first();
  }

  findByUsername(username: string): Promise<User | null> {
    return db.orm.public.User.where((u) => u.username.eq(username)).first();
  }

  findById(id: string): Promise<User | null> {
    return db.orm.public.User.first({ id });
  }

  // Invalidates every JWT issued to this user so far (logout, suspension, forced sign-out).
  async bumpTokenVersion(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) return;
    await db.orm.public.User.where((u) => u.id.eq(id)).update({ tokenVersion: user.tokenVersion + 1 });
  }

  async create(input: CreateUserInput): Promise<User> {
    try {
      return await db.orm.public.User.create(input);
    } catch (err) {
      if (isUniqueViolation(err)) {
        const field = err.constraint?.includes('username') ? 'username' : 'email';
        throw new ConflictException(`A user with this ${field} already exists`);
      }
      throw err;
    }
  }
}
