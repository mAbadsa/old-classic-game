import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { SavedFile, StorageProvider } from './storage-provider.interface.js';

// Just a directory — Docker Compose points this at a mounted named volume
// (e.g. `-v roms:/data/roms` with UPLOADS_DIR=/data/roms) in production-like
// setups; plain local dev works identically against any local path.
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'roms');
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

// Keys are "roms/<uuid><ext>" as returned by save(). basename() strips any
// directory segments so a crafted key can't point outside UPLOADS_DIR.
function localPathFor(key: string): string {
  return join(UPLOADS_DIR, basename(key));
}

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

  // stat() first so a missing file rejects here, not as a stream error later.
  async open(path: string) {
    const filePath = localPathFor(path);
    await stat(filePath);
    return createReadStream(filePath);
  }

  async delete(path: string): Promise<void> {
    await rm(localPathFor(path), { force: true });
  }
}
