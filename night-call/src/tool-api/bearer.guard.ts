import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

import { settings } from '../config/settings';

type ToolRequest = { method: string; path: string; headers: { authorization?: string } };

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function bearerMatches(header: string, token: string): boolean {
  if (token === '') return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${token}`));
}

@Injectable()
export class BearerGuard implements CanActivate {
  private readonly log = new Logger('ToolApi');

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ToolRequest>();
    const authorized = bearerMatches(request.headers.authorization ?? '', settings.toolToken);
    this.log.log(`${request.method} ${request.path} ${authorized ? 'authorized' : 'refused'}`);
    if (authorized) return true;
    throw new UnauthorizedException();
  }
}
