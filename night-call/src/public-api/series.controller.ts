import { BadRequestException, Controller, Get, Inject, Param, Req, Res } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { z } from 'zod';

import { EventWriter } from '../investigation/event-writer';
import { incidentFolder, validIncidentId } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';
import { ProductionWatch } from '../recorder/production-watch';
import { readJsonLines, seriesPath } from '../recorder/series-files';
import type { SeriesSample } from '../recorder/series-sample';
import { PRODUCTION_SERVICES } from '../recorder/series-services';
import { seriesReply } from '../recorder/series-reply';
import { experimentSamples } from './experiment-series';

const seriesQueryShape = z.object({
  service: z.enum(PRODUCTION_SERVICES),
  minutes: z.coerce.number().int().min(1).max(30).default(30),
});

type HeaderResponse = { setHeader(name: string, value: string): unknown };
type SeriesRequest = { params: Record<string, string>; query: unknown };

function parseSeriesQuery(query: unknown): z.infer<typeof seriesQueryShape> {
  const parsed = seriesQueryShape.safeParse(query);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ message: 'invalid series query', issues: parsed.error.issues });
}

@Controller('api/incidents')
export class SeriesController {
  constructor(
    @Inject(EventWriter) private readonly writer: EventWriter,
    @Inject(ProductionWatch) private readonly watch: ProductionWatch,
  ) {}

  @Get(':id/series')
  series(@Req() request: SeriesRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    const incidentId = validIncidentId(request.params.id);
    requireSnapshot(this.writer.stateDir, incidentId);
    const { service, minutes } = parseSeriesQuery(request.query);
    const path = seriesPath(incidentFolder(this.writer.stateDir, incidentId), service);
    const fromIncident = existsSync(path);
    response.setHeader('X-NightCall-Series-Source', fromIncident ? 'incident' : 'recorder');
    const samples = fromIncident ? readJsonLines<SeriesSample>(path) : this.watch.recorder.tracks.windowOf(service);
    return seriesReply({ service, samples, minutes });
  }

  @Get(':id/experiments/:experimentId/series')
  experimentSeries(@Param('id') id: string, @Param('experimentId') experimentId: string) {
    const incidentId = validIncidentId(id);
    const snapshot = requireSnapshot(this.writer.stateDir, incidentId);
    const folder = incidentFolder(this.writer.stateDir, incidentId);
    const samples = experimentSamples({ folder, experiment: snapshot.experiments.find((item) => item.id === experimentId) });
    return seriesReply({ service: snapshot.incident.service, samples, minutes: 30 });
  }
}
