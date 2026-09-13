import { Module } from '@nestjs/common';

import { PublicController } from './public.controller';
import { SeriesController } from './series.controller';

@Module({ controllers: [PublicController, SeriesController] })
export class PublicApiModule {}
