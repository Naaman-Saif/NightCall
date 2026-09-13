import React from 'react';
import { Icon } from './Icon.jsx';

/* [ink, opaque ground] — badges never sit on an alpha wash */
const TONES = {
  neutral: ['var(--on-solid-neutral)', 'var(--fill-neutral)'],
  accent: ['var(--on-solid)', 'var(--fill-accent)'],
  observed: ['var(--on-solid)', 'var(--fill-observed)'],
  hypothesis: ['var(--on-solid)', 'var(--fill-hypothesis)'],
  verified: ['var(--on-solid)', 'var(--fill-verified)'],
  critical: ['var(--on-solid)', 'var(--fill-critical)'],
};

export function Badge({ tone = 'neutral', icon, dot, numeric, uppercase, children, style, ...rest }) {
  const [fg, bg] = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, padding: '0 7px',
        borderRadius: 'var(--radius-xs)', background: bg, border: '1px solid transparent', color: fg,
        fontFamily: 'var(--font-core)', fontSize: 'var(--text-2xs)',
        fontVariantNumeric: numeric ? 'var(--numeric)' : 'normal',
        fontWeight: 'var(--fw-semibold)', letterSpacing: uppercase ? 'var(--track-caps)' : 'var(--track-normal)',
        textTransform: uppercase ? 'uppercase' : 'none', whiteSpace: 'nowrap', ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: fg }} />}
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
