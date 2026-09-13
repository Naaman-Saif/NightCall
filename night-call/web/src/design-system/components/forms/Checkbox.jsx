import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Checkbox({ checked, onChange, label, hint, disabled, style, ...rest }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, ...style }} {...rest}>
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
          width: 16, height: 16, marginTop: 1, borderRadius: 'var(--radius-xs)',
          background: checked ? 'var(--accent)' : 'var(--surface-inset)',
          border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--line-strong)'),
          color: 'var(--accent-ink)', transition: 'var(--transition-control)',
        }}
      >
        {checked && <Icon name="check" size={12} />}
      </span>
      {(label || hint) && (
        <span style={{ minWidth: 0 }}>
          {label && <span style={{ display: 'block', font: 'var(--type-body-sm)', color: 'var(--text-title)' }}>{label}</span>}
          {hint && <span style={{ display: 'block', marginTop: 2, font: 'var(--type-meta-sm)', color: 'var(--text-muted)' }}>{hint}</span>}
        </span>
      )}
    </label>
  );
}
