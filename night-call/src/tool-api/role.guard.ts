import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import type { Role } from '../investigation/event-types';
import { configuredRoleTokens, roleForAuthorization } from './role-token';

export type ToolRequest = {
  method: string;
  path: string;
  headers: { authorization?: string };
  params: Record<string, string>;
  body: unknown;
  toolRole?: Role;
};

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly log = new Logger('ToolApi');

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ToolRequest>();
    const role = roleForAuthorization(request.headers.authorization ?? '', configuredRoleTokens);
    this.log.log(`${request.method} ${request.path} ${role ?? 'refused'}`);
    if (!role) throw new UnauthorizedException();
    request.toolRole = role;
    return true;
  }
}
