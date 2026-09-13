import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import type { IncidentEvent } from '../investigation/event-types';
import { EventWriter } from '../investigation/event-writer';
import { LiveStream } from '../investigation/live-stream';
import { githubJson } from '../production/github-client';
import { publishPullRequest } from './publish-pr';

@Injectable()
export class PublicationWatcher implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Publication');
  private readonly startedRuns = new Set<string>();
  private unsubscribe: () => void = () => undefined;

  constructor(
    @Inject(EventWriter) private readonly writer: EventWriter,
    @Inject(LiveStream) private readonly stream: LiveStream,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.stream.subscribeAll((event) => this.notice(event));
  }

  onModuleDestroy(): void {
    this.unsubscribe();
  }

  private notice(event: IncidentEvent): void {
    if (event.type !== 'verification_reviewed' || event.payload.approved !== true) return;
    const runKey = `${event.incidentId}:${String(event.payload.verificationRunId)}`;
    if (this.startedRuns.has(runKey)) return;
    this.startedRuns.add(runKey);
    setImmediate(() => {
      publishPullRequest({ writer: this.writer, github: githubJson }, event.incidentId)
        .then((outcome) => this.log.log(`publication for ${event.incidentId}: ${outcome ?? 'published'}`))
        .catch((error: unknown) => this.log.error(`publication for ${event.incidentId} failed: ${String(error)}`));
    });
  }
}
