import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from './jwt.strategy.js';

/**
 * `@UseGuards(JwtAuthGuard)` alone only proves *someone* is logged in —
 * without this, any authenticated user could read another user's private
 * data just by changing an id in the URL.
 */
export function assertOwnerOrAdmin(user: AuthenticatedUser, ownerId: string): void {
  if (user.id !== ownerId && user.role !== 'admin') {
    throw new ForbiddenException('Insufficient permissions');
  }
}
