import { roleForAuthorization, type RoleTokens } from './role-token';

const tokens: RoleTokens = { lead: 'lead-value', investigator: 'investigator-value', verifier: 'verifier-value' };

describe('role tokens', () => {
  it('maps each bearer token to exactly its role', () => {
    expect(roleForAuthorization('Bearer lead-value', tokens)).toBe('lead');
    expect(roleForAuthorization('Bearer investigator-value', tokens)).toBe('investigator');
    expect(roleForAuthorization('Bearer verifier-value', tokens)).toBe('verifier');
  });

  it('refuses unknown, empty and unconfigured tokens', () => {
    expect(roleForAuthorization('Bearer wrong', tokens)).toBeUndefined();
    expect(roleForAuthorization('', tokens)).toBeUndefined();
    expect(roleForAuthorization('Bearer ', { ...tokens, lead: '' })).toBeUndefined();
  });
});
