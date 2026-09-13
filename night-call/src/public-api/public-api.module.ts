import { Module } from '@nestjs/common';

import { MarkersController } from './markers.controller';
import { PublicController } from './public.controller';
import { SeriesController } from './series.controller';

@Module({ controllers: [PublicController, SeriesController, MarkersController] })
export class PublicApiModule {}
