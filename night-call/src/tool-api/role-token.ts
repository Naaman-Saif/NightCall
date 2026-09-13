import { secretMatches } from '../config/secret-matches';
import { settings } from '../config/settings';
import { ROLES, type Role } from '../investigation/event-types';

export type RoleTokens = Record<Role, string>;

export const configuredRoleTokens: RoleTokens = {
  lead: settings.toolTokenLead,
  investigator: settings.toolTokenInvestigator,
  verifier: settings.toolTokenVerifier,
};

export function roleForAuthorization(header: string, tokens: RoleTokens): Role | undefined {
  return ROLES.find((role) => tokens[role] !== '' && secretMatches(header, `Bearer ${tokens[role]}`));
}
