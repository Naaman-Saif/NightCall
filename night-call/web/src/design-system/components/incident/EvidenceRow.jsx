import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function EvidenceRow({ label, value, source, window: win, tone = 'default', href, style, ...rest }) {
  const color = tone === 'critical' ? 'var(--critical-400)' : tone === 'verified' ? 'var(--verified-400)' : 'var(--text-title)';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'baseline', gap: 'var(--sp-3)',
      padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--line-hairline)', ...style,
    }} {...rest}>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>{label}</div>
        {(source || win) && (
          <div style={{ marginTop: 2, font: 'var(--type-meta-sm)', color: 'var(--text-faint)' }}>
            {source}{source && win ? ' · ' : ''}{win}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--type-body-sm)', fontWeight: 'var(--fw-semibold)', fontVariantNumeric: 'var(--numeric)', color, whiteSpace: 'nowrap' }}>
        {value}
        {href && <Icon name="external-link" size={12} style={{ color: 'var(--text-faint)' }} />}
      </div>
    </div>
  );
}
