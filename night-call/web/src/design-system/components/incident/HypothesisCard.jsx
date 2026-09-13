import React from 'react';
import { ClaimLabel } from './ClaimLabel.jsx';
import { Icon } from '../core/Icon.jsx';

export function HypothesisCard({ index, title, claim = 'hypothesis', qualifier, supporting = [], contradicting = [], nextStep, active, style, ...rest }) {
  return (
    <div style={{
      padding: 'var(--card-pad)', background: active ? 'var(--surface-raised)' : 'var(--surface-card)',
      border: '1px solid ' + (active ? 'var(--beacon-600)' : 'var(--line-soft)'),
      borderRadius: 'var(--radius-md)', ...style,
    }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
        {index != null && <span style={{ font: 'var(--type-meta-sm)', color: 'var(--text-faint)' }}>H{index}</span>}
        <div style={{ flex: 1, font: 'var(--type-subheading)', color: 'var(--text-title)', lineHeight: 'var(--lh-snug)' }}>{title}</div>
      </div>
      <ClaimLabel claim={claim} size="sm" qualifier={qualifier} />
      {supporting.length > 0 && (
        <ul style={{ margin: 'var(--sp-3) 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
          {supporting.map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: 'var(--sp-2)', font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
              <Icon name="plus" size={12} style={{ color: 'var(--verified-400)', marginTop: 4 }} />{s}
            </li>
          ))}
        </ul>
      )}
      {contradicting.length > 0 && (
        <ul style={{ margin: 'var(--sp-2) 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
          {contradicting.map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: 'var(--sp-2)', font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
              <Icon name="minus" size={12} style={{ color: 'var(--critical-400)', marginTop: 4 }} />{s}
            </li>
          ))}
        </ul>
      )}
      {nextStep && (
        <div style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--line-hairline)', font: 'var(--type-meta-sm)', color: 'var(--text-muted)' }}>
          Next: {nextStep}
        </div>
      )}
    </div>
  );
}
