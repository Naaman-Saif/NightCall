import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Tabs({ items = [], value, onChange, style, ...rest }) {
  return (
    <div role="tablist" style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--sp-1)', borderBottom: '1px solid var(--line-soft)', ...style }} {...rest}>
      {items.map((it) => {
        const id = typeof it === 'string' ? it : it.value;
        const label = typeof it === 'string' ? it : it.label;
        const active = id === value;
        return (
          <button
            key={id} role="tab" aria-selected={active} onClick={() => onChange && onChange(id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 var(--sp-3)',
              background: 'transparent', border: 'none',
              borderBottom: '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
              marginBottom: -1, color: active ? 'var(--text-title)' : 'var(--text-muted)',
              fontFamily: 'var(--font-core)', fontSize: 'var(--text-sm)',
              fontWeight: active ? 'var(--fw-semibold)' : 'var(--fw-medium)',
              cursor: 'pointer', transition: 'var(--transition-control)',
            }}
          >
            {it.icon && <Icon name={it.icon} size={14} />}
            {label}
            {it.count != null && (
              <span style={{ font: 'var(--type-meta-sm)', color: active ? 'var(--accent)' : 'var(--text-faint)' }}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
