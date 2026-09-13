import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Input({ label, hint, error, icon, numeric, size = 'md', style, wrapperStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 28 : 34;
  return (
    <label style={{ display: 'block', ...wrapperStyle }}>
      {label && <div style={{ font: 'var(--type-label)', color: 'var(--text-body)', marginBottom: 'var(--sp-2)' }}>{label}</div>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', height: h, padding: '0 var(--sp-3)',
        background: 'var(--surface-inset)',
        border: '1px solid ' + (error ? 'var(--critical-400)' : focus ? 'var(--accent)' : 'var(--line)'),
        borderRadius: 'var(--radius-sm)',
        boxShadow: focus ? '0 0 0 2px var(--focus-ring)' : 'none',
        transition: 'var(--transition-control)',
      }}>
        {icon && <Icon name={icon} size={14} style={{ color: 'var(--text-faint)' }} />}
        <input
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', padding: 0,
            color: 'var(--text-title)', fontFamily: 'var(--font-core)', fontVariantNumeric: numeric ? 'var(--numeric)' : 'normal',
            fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)', ...style,
          }}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <div style={{ marginTop: 6, font: 'var(--type-meta-sm)', color: error ? 'var(--critical-400)' : 'var(--text-muted)' }}>{error || hint}</div>
      )}
    </label>
  );
}
