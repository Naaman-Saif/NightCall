import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Select({ label, hint, options = [], size = 'md', style, wrapperStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 28 : 34;
  return (
    <label style={{ display: 'block', ...wrapperStyle }}>
      {label && <div style={{ font: 'var(--type-label)', color: 'var(--text-body)', marginBottom: 'var(--sp-2)' }}>{label}</div>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            appearance: 'none', width: '100%', height: h, padding: '0 28px 0 var(--sp-3)',
            background: 'var(--surface-inset)',
            border: '1px solid ' + (focus ? 'var(--accent)' : 'var(--line)'),
            borderRadius: 'var(--radius-sm)', outline: 'none',
            boxShadow: focus ? '0 0 0 2px var(--focus-ring)' : 'none',
            color: 'var(--text-title)', fontFamily: 'var(--font-core)',
            fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
            transition: 'var(--transition-control)', cursor: 'pointer', ...style,
          }}
          {...rest}
        >
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : o.label;
            return <option key={v} value={v} style={{ background: 'var(--night-800)' }}>{l}</option>;
          })}
        </select>
        <Icon name="chevron-down" size={14} style={{ position: 'absolute', right: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
      </div>
      {hint && <div style={{ marginTop: 6, font: 'var(--type-meta-sm)', color: 'var(--text-muted)' }}>{hint}</div>}
    </label>
  );
}
