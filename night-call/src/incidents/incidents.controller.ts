import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';

import { alertPayloadSchema } from './alert-payload';
import { IncidentsService } from './incidents.service';

@Controller('alerts')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Post()
  @HttpCode(202)
  async receive(@Body() body: unknown): Promise<{ opened: string[] }> {
    const parsed = alertPayloadSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return { opened: await this.incidents.receive(parsed.data) };
  }
}
