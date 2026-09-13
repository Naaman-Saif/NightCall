import { ForbiddenException } from '@nestjs/common';

import type { Role } from '../investigation/event-types';
import type { ToolRequest } from './role.guard';

export function requireRole(request: ToolRequest, roles: Role[]): Role {
  const role = request.toolRole;
  if (role && roles.includes(role)) return role;
  throw new ForbiddenException(`only ${roles.join(' and ')} may use ${request.method} ${request.path}`);
}
