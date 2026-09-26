import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LocalStorageProvider } from './storage/local-storage.provider.js';
import { S3StorageProvider } from './storage/s3-storage.provider.js';
import { STORAGE_PROVIDER } from './storage/storage-provider.interface.js';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: STORAGE_PROVIDER,
      // STORAGE_DRIVER=s3 switches to S3StorageProvider (see storage/s3-storage.provider.ts)
      // for production; local disk/Docker-volume storage is the default.
      useFactory: () =>
        process.env.STORAGE_DRIVER === 's3' ? new S3StorageProvider() : new LocalStorageProvider(),
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
