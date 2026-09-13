import React from 'react';
import { Icon } from './Icon.jsx';

const SIZES = {
  sm: { h: 26, px: 'var(--sp-2)', font: 'var(--text-xs)', gap: 5, icon: 13 },
  md: { h: 32, px: 'var(--sp-3)', font: 'var(--text-sm)', gap: 6, icon: 15 },
  lg: { h: 38, px: 'var(--sp-4)', font: 'var(--text-md)', gap: 8, icon: 16 },
};

const VARIANTS = {
  primary: { bg: 'var(--accent)', fg: 'var(--accent-ink)', bd: 'transparent', hover: 'var(--accent-hover)', press: 'var(--accent-press)' },
  secondary: { bg: 'var(--surface-raised)', fg: 'var(--text-title)', bd: 'var(--line)', hover: 'var(--night-750)', press: 'var(--night-800)' },
  ghost: { bg: 'transparent', fg: 'var(--text-body)', bd: 'transparent', hover: 'var(--surface-hover)', press: 'var(--surface-active)' },
  danger: { bg: 'var(--fill-critical)', fg: 'var(--on-solid)', bd: 'transparent', hover: 'var(--critical-300)', press: 'var(--critical-500)' },
};

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, disabled, loading, full, children, style, onClick, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.secondary;
  const [state, setState] = React.useState('rest');
  const bg = disabled || loading ? v.bg : state === 'press' ? v.press : state === 'hover' ? v.hover : v.bg;
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={() => setState('hover')}
      onMouseLeave={() => setState('rest')}
      onMouseDown={() => setState('press')}
      onMouseUp={() => setState('hover')}
      style={{
        display: full ? 'flex' : 'inline-flex', width: full ? '100%' : undefined,
        alignItems: 'center', justifyContent: 'center', gap: s.gap,
        height: s.h, padding: '0 ' + s.px, fontFamily: 'var(--font-core)', fontSize: s.font,
        fontWeight: 'var(--fw-medium)', letterSpacing: 'var(--track-normal)',
        color: v.fg, background: bg, border: '1px solid ' + v.bd,
        borderRadius: 'var(--radius-sm)', cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, transition: 'var(--transition-control)', whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {loading ? <Icon name="loader-circle" size={s.icon} style={{ animation: 'nc-pulse var(--dur-pulse) infinite' }} /> : icon ? <Icon name={icon} size={s.icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={s.icon} /> : null}
    </button>
  );
}
