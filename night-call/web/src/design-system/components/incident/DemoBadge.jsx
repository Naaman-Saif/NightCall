import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function DemoBadge({ label = 'Illustrative demo data', style, ...rest }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: 18, padding: '0 7px',
      background: 'var(--fill-reproduced)', border: '1px solid transparent',
      borderRadius: 'var(--radius-xs)', color: 'var(--on-solid)',
      fontFamily: 'var(--font-core)', fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--track-caps)', textTransform: 'uppercase', whiteSpace: 'nowrap', ...style,
    }} {...rest}>
      <Icon name="flask-conical" size={10} />{label}
    </span>
  );
}
