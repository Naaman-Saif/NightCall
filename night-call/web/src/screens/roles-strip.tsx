import type { RoleName, RoleStatus, Snapshot } from '../api/contract';
import { RoleTag } from '../kit';

const ROLE_NAMES: RoleName[] = ['lead', 'investigator', 'verifier'];

const ROLE_STATUS_TEXT: Record<RoleStatus, string> = {
  ready: 'Ready',
  working: 'Working',
  waiting_for_evidence: 'Waiting for evidence',
  waiting_for_context: 'Waiting for the operator',
  reviewing: 'Reviewing',
  finished: 'Finished',
};

export function RolesStrip({ roles }: { roles: Snapshot['roles'] }) {
  return (
    <div className="roles-strip section-roles">
      {ROLE_NAMES.map((role) => (
        <div key={role} className="role-tile" data-role={role}>
          <RoleTag role={role} variant="full" />
          <span className="fact-value">{ROLE_STATUS_TEXT[roles[role].status]}</span>
          <span className="meta">{roles[role].assignment || 'No assignment yet'}</span>
        </div>
      ))}
    </div>
  );
}
