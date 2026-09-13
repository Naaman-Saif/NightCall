import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { secretMatches } from '../config/secret-matches';
import { settings } from '../config/settings';

type OperatorRequest = { headers: Record<string, string | string[] | undefined> };

export const OPERATOR_HEADER = 'x-nightcall-operator';

export function operatorHeaderMatches(header: unknown, secret: string): boolean {
  return typeof header === 'string' && secretMatches(header, secret);
}

@Injectable()
export class OperatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OperatorRequest>();
    if (operatorHeaderMatches(request.headers[OPERATOR_HEADER], settings.operatorSecret)) return true;
    throw new ForbiddenException('operator header required');
  }
}
