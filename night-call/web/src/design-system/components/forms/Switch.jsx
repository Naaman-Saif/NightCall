import React from 'react';

export function Switch({ checked, onChange, label, hint, disabled, style, ...rest }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, ...style }} {...rest}>
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          position: 'relative', flex: '0 0 auto', width: 32, height: 18, borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--accent)' : 'var(--night-700)',
          border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--line-strong)'),
          transition: 'var(--transition-control)',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 15 : 2, width: 12, height: 12,
          borderRadius: 'var(--radius-pill)', background: checked ? 'var(--accent-ink)' : 'var(--night-300)',
          transition: 'left var(--dur-fast) var(--ease-standard)',
        }} />
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
