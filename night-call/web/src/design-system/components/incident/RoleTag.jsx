import React from 'react';
import { Icon } from '../core/Icon.jsx';

export const ROLES = {
  lead: { label: 'Investigation lead', short: 'Lead', icon: 'compass', color: 'var(--beacon-300)' },
  investigator: { label: 'Experiment investigator', short: 'Investigator', icon: 'flask-conical', color: 'var(--observed-400)' },
  verifier: { label: 'Independent verifier', short: 'Verifier', icon: 'shield-check', color: 'var(--verified-400)' },
  developer: { label: 'You', short: 'You', icon: 'user', color: 'var(--night-200)' },
};

export function RoleTag({ role = 'lead', variant = 'inline', style, ...rest }) {
  const r = ROLES[role] || ROLES.lead;
  if (variant === 'avatar') {
    return (
      <span title={r.label} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
        borderRadius: 'var(--radius-sm)', background: 'var(--surface-raised)',
        border: '1px solid var(--line)', color: r.color, ...style,
      }} {...rest}><Icon name={r.icon} size={14} /></span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: r.color, font: 'var(--type-meta-sm)', whiteSpace: 'nowrap', ...style }} {...rest}>
      <Icon name={r.icon} size={12} />
      {variant === 'full' ? r.label : r.short}
    </span>
  );
}
