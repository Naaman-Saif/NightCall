import React from 'react';

const PADS = { none: 0, sm: 'var(--sp-3)', md: 'var(--card-pad)', lg: 'var(--panel-pad)' };

export function Card({ title, eyebrow, actions, padding = 'md', tone = 'default', live, children, style, ...rest }) {
  const border = tone === 'accent' ? 'var(--beacon-600)' : tone === 'critical' ? 'var(--critical-700)' : 'var(--line-soft)';
  return (
    <section
      style={{
        background: 'var(--surface-card)', border: '1px solid ' + border,
        borderRadius: 'var(--radius-md)', boxShadow: live ? 'var(--shadow-glow-accent)' : 'none',
        overflow: 'hidden', ...style,
      }}
      {...rest}
    >
      {(title || eyebrow || actions) && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--card-pad)', borderBottom: '1px solid var(--line-hairline)' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {eyebrow && <div style={{ font: 'var(--type-eyebrow)', letterSpacing: 'var(--track-caps)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{eyebrow}</div>}
            {title && <h3 style={{ font: 'var(--type-heading)', letterSpacing: 'var(--track-tight)', color: 'var(--text-title)' }}>{title}</h3>}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>{actions}</div>}
        </header>
      )}
      <div style={{ padding: PADS[padding] }}>{children}</div>
    </section>
  );
}
