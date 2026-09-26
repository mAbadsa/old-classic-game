import 'dotenv/config';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000',
  });
  // Serves whatever LocalStorageProvider writes (see uploads/storage/local-storage.provider.ts)
  // at the same /uploads/roms/<file> URL it returns. Irrelevant when STORAGE_DRIVER=s3.
  app.useStaticAssets(process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'roms'), {
    prefix: '/uploads/roms/',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
