import React from 'react';
import { Icon } from './Icon.jsx';

const S = { sm: 24, md: 30, lg: 36 };

export function IconButton({ icon, size = 'md', label, active, disabled, tone = 'default', onClick, style, ...rest }) {
  const box = S[size] || S.md;
  const [hover, setHover] = React.useState(false);
  const fg = tone === 'accent' ? 'var(--accent)' : tone === 'danger' ? 'var(--critical-400)' : active ? 'var(--text-title)' : 'var(--text-muted)';
  return (
    <button
      type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: box, height: box, padding: 0, color: hover && !disabled ? 'var(--text-title)' : fg,
        background: active ? 'var(--surface-active)' : hover && !disabled ? 'var(--surface-hover)' : 'transparent',
        border: '1px solid ' + (active ? 'var(--line)' : 'transparent'), borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'var(--transition-control)', ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
    </button>
  );
}
