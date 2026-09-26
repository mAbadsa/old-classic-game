import { extname } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER, type StorageProvider } from './storage/storage-provider.interface.js';

export interface UploadRomResult {
  path: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class UploadsService {
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
}
