import React from 'react';
import { Icon } from '../core/Icon.jsx';

export const CLAIMS = {
  observed: { label: 'Observed', fg: 'var(--on-solid)', bg: 'var(--fill-observed)', icon: 'eye' },
  hypothesis: { label: 'Hypothesis', fg: 'var(--on-solid)', bg: 'var(--fill-hypothesis)', icon: 'git-branch' },
  inconclusive: { label: 'Inconclusive', fg: 'var(--on-solid-neutral)', bg: 'var(--fill-inconclusive)', icon: 'circle-dashed' },
  reproduced: { label: 'Reproduced', fg: 'var(--on-solid)', bg: 'var(--fill-reproduced)', icon: 'target' },
  verified: { label: 'Mitigation verified', fg: 'var(--on-solid)', bg: 'var(--fill-verified)', icon: 'shield-check' },
  failing: { label: 'Failing', fg: 'var(--on-solid)', bg: 'var(--fill-critical)', icon: 'triangle-alert' },
};

/** The closed claim vocabulary. Never invent a state and never show a confidence score. */
export function ClaimLabel({ claim = 'observed', size = 'md', qualifier, style, ...rest }) {
  const c = CLAIMS[claim] || CLAIMS.observed;
  const sm = size === 'sm';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--sp-2)', ...style }} {...rest}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, height: sm ? 18 : 22, padding: sm ? '0 6px' : '0 8px',
        background: c.bg, border: '1px solid transparent', borderRadius: 'var(--radius-xs)', color: c.fg,
        fontFamily: 'var(--font-core)', fontSize: sm ? 'var(--text-2xs)' : 'var(--text-xs)',
        fontWeight: 'var(--fw-semibold)', letterSpacing: 'var(--track-wide)', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        <Icon name={c.icon} size={sm ? 11 : 12} />
        {c.label}
      </span>
      {qualifier && <span style={{ font: 'var(--type-meta-sm)', fontVariantNumeric: 'var(--numeric)', color: 'var(--text-muted)' }}>{qualifier}</span>}
    </span>
  );
}
