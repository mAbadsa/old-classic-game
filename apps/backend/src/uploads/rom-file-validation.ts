import { extname } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

export const ALLOWED_ROM_EXTENSIONS = ['.nes', '.smd', '.bin', '.rom'] as const;

// Generous headroom for any of the retro-console ROMs this app targets
// (largest realistic case is a multi-MB Genesis/SNES image) while still
// bounding request size against abuse.
export const MAX_ROM_SIZE_BYTES = 32 * 1024 * 1024;

export function romFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const extension = extname(file.originalname).toLowerCase();
  if (!ALLOWED_ROM_EXTENSIONS.includes(extension as (typeof ALLOWED_ROM_EXTENSIONS)[number])) {
    callback(
      new BadRequestException(
        `Unsupported ROM file type "${extension || file.originalname}". Allowed: ${ALLOWED_ROM_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
    return;
  }
  callback(null, true);
}
