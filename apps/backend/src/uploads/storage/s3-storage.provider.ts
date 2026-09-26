import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { SavedFile, StorageProvider } from './storage-provider.interface.js';

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  '.nes': 'application/x-nes-rom',
  '.smd': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.rom': 'application/octet-stream',
};

/**
 * The production-later storage path (STORAGE_DRIVER=s3). Requires
 * AWS_S3_BUCKET and AWS_REGION; credentials resolve through the SDK's
 * default provider chain (env vars, shared config, instance role, ...) —
 * nothing here reads AWS keys directly.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly bucket = process.env.AWS_S3_BUCKET;
  private readonly region = process.env.AWS_REGION ?? 'us-east-1';
  private readonly client = new S3Client({ region: this.region });

  async save(buffer: Buffer, extension: string): Promise<SavedFile> {
    if (!this.bucket) {
      throw new Error('AWS_S3_BUCKET must be set to use the S3 storage driver');
    }

    const key = `roms/${randomUUID()}${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: EXTENSION_CONTENT_TYPES[extension] ?? 'application/octet-stream',
      }),
    );

    return {
      path: key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
    };
  }
}
