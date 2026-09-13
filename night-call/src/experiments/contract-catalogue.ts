import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export type Comparator = 'gte' | 'lte' | 'eq';
export type ContractCheck = { name: string; comparator: Comparator; value: number; unit: string };
type CatalogueEntry = { comparator: Comparator; unit: string; min: number; max: number };

export const CHECK_CATALOGUE: Record<string, CatalogueEntry> = {
  'fault.oom_kills': { comparator: 'gte', unit: 'count', min: 1, max: 1 },
  'fault.http_failures': { comparator: 'gte', unit: 'count', min: 1, max: 1 },
  'mitigated.http_failures': { comparator: 'eq', unit: 'count', min: 0, max: 0 },
  'mitigated.restarts': { comparator: 'eq', unit: 'count', min: 0, max: 0 },
  'mitigated.healthy_requests': { comparator: 'gte', unit: 'requests', min: 200, max: 600 },
  'mitigated.peak_memory_share': { comparator: 'lte', unit: 'share', min: 0.5, max: 0.9 },
};

const contractBodyShape = z.object({
  checks: z.array(z.object({ name: z.string(), comparator: z.string(), value: z.number(), unit: z.string().max(40) })).min(1).max(6),
});

function badCheck(detail: string): BadRequestException {
  return new BadRequestException({ code: 'bad_check', detail });
}

function catalogueCheck(check: { name: string; comparator: string; value: number }): ContractCheck {
  const entry = CHECK_CATALOGUE[check.name];
  if (!entry) throw badCheck(`${check.name} is not in the catalogue: ${Object.keys(CHECK_CATALOGUE).join(', ')}`);
  if (check.comparator !== entry.comparator) throw badCheck(`${check.name} must use ${entry.comparator}`);
  const inBounds = check.value >= entry.min && check.value <= entry.max;
  if (!inBounds) throw badCheck(`${check.name} value must be between ${entry.min} and ${entry.max}`);
  return { name: check.name, comparator: entry.comparator, value: check.value, unit: entry.unit };
}

export function parseContractBody(body: unknown): ContractCheck[] {
  const parsed = contractBodyShape.safeParse(body);
  if (!parsed.success) throw badCheck(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  const names = parsed.data.checks.map((check) => check.name);
  if (new Set(names).size !== names.length) throw badCheck('each check name may appear once');
  return parsed.data.checks.map(catalogueCheck);
}
