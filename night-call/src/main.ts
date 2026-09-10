import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { blankSettings, settings } from './config/settings';

async function bootstrap(): Promise<void> {
  const missing = blankSettings();
  if (missing.length > 0) {
    throw new Error(`missing settings: ${missing.join(', ')}`);
  }
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(settings.port, settings.host);
}

void bootstrap();
