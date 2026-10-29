import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

// Covers and thumbnails are shown at card/hero size; 5 MB is ample.
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function imageExtensionFor(mimeType: string): string | undefined {
  return IMAGE_EXTENSIONS[mimeType];
}

export function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!imageExtensionFor(file.mimetype)) {
    callback(
      new BadRequestException(
        `Unsupported image type "${file.mimetype}" for "${file.fieldname}". Allowed: PNG, JPEG, WebP`,
      ),
      false,
    );
    return;
  }
  callback(null, true);
}

export function assertImageSize(file: Express.Multer.File): void {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestException(`"${file.fieldname}" must be at most 5 MB`);
  }
}
