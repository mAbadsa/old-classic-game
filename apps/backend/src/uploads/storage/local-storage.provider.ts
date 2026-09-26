import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { SavedFile, StorageProvider } from './storage-provider.interface.js';

// Just a directory — Docker Compose points this at a mounted named volume
// (e.g. `-v roms:/data/roms` with UPLOADS_DIR=/data/roms) in production-like
// setups; plain local dev works identically against any local path.
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'roms');
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  async save(buffer: Buffer, extension: string): Promise<SavedFile> {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(UPLOADS_DIR, filename), buffer);

    return {
      path: `roms/${filename}`,
      url: `${APP_URL}/uploads/roms/${filename}`,
    };
  }
}
