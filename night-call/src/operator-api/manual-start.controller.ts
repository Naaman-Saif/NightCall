import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';

import { ManualStartService, STARTABLE_SERVICES } from '../incidents/manual-start.service';
import { OperatorGuard } from './operator.guard';

@Controller('op/api')
@UseGuards(OperatorGuard)
export class ManualStartController {
  constructor(@Inject(ManualStartService) private readonly starter: ManualStartService) {}

  @Get('services')
  services(): string[] {
    return [...STARTABLE_SERVICES];
  }

  @Post('investigations')
  @HttpCode(201)
  start(@Body() body: unknown) {
    return this.starter.start(body);
  }
}
