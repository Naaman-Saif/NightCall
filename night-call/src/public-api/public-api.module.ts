import { Module } from '@nestjs/common';

import { EvidenceController } from './evidence.controller';
import { LiveProgressController } from './live-progress.controller';
import { MarkersController } from './markers.controller';
import { PublicController } from './public.controller';
import { SeriesController } from './series.controller';

@Module({ controllers: [PublicController, SeriesController, MarkersController, EvidenceController, LiveProgressController] })
export class PublicApiModule {}
