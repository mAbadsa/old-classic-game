import { extname } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { STORAGE_PROVIDER, type SavedFile, type StorageProvider } from './storage/storage-provider.interface.js';

export interface UploadRomResult {
  path: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  async storeRom(file: Express.Multer.File): Promise<UploadRomResult> {
    const extension = extname(file.originalname).toLowerCase();
    const saved = await this.storage.save(file.buffer, extension);

    return {
      path: saved.path,
      url: saved.url,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  openStored(path: string) {
    return this.storage.open(path);
  }

  // Saves every file, then runs onStored with the results. If a save or
  // onStored throws, the files already saved are deleted before rethrowing,
  // so a failed upload leaves nothing behind.
  async storeAllOrNone<T>(
    items: { buffer: Buffer; extension: string }[],
    onStored: (saved: SavedFile[]) => Promise<T>,
  ): Promise<T> {
    const saved: SavedFile[] = [];
    try {
      for (const item of items) {
        saved.push(await this.storage.save(item.buffer, item.extension));
      }
      return await onStored(saved);
    } catch (error) {
      await Promise.all(
        saved.map((file) =>
          this.storage.delete(file.path).catch((cleanupError: unknown) => {
            this.logger.error(`Could not remove orphaned file "${file.path}"`, cleanupError);
          }),
        ),
      );
      throw error;
    }
  }
}
