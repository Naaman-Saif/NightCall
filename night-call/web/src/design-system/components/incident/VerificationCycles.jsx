import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* Opaque tiles — light fills carry --on-solid ink, the pending tile carries --on-solid-neutral */
const STATE = {
  passed: { color: 'var(--on-solid)', ink: 'var(--on-solid)', bg: 'var(--fill-verified)', icon: 'check', label: 'passed' },
  failed: { color: 'var(--on-solid)', ink: 'var(--on-solid)', bg: 'var(--fill-critical)', icon: 'x', label: 'failed' },
  running: { color: 'var(--on-solid)', ink: 'var(--on-solid)', bg: 'var(--fill-reproduced)', icon: 'loader-circle', label: 'running' },
  pending: { color: 'var(--on-solid-neutral)', ink: 'var(--on-solid-neutral)', bg: 'var(--fill-neutral)', icon: 'circle-dashed', label: 'pending' },
};

export function VerificationCycles({ cycles = [], conditions, style, ...rest }) {
  const passed = cycles.filter((c) => c.state === 'passed').length;
  return (
    <div style={{ ...style }} {...rest}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--sp-2)' }}>
        {cycles.map((c, i) => {
          const s = STATE[c.state] || STATE.pending;
          return (
            <div key={i} style={{ padding: 'var(--sp-3)', background: s.bg, border: '1px solid transparent', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.color }}>
                <Icon name={s.icon} size={13} style={c.state === 'running' ? { animation: 'nc-pulse var(--dur-pulse) infinite' } : undefined} />
                <span style={{ font: 'var(--type-meta-sm)', fontWeight: 'var(--fw-semibold)', letterSpacing: 'var(--track-wide)', textTransform: 'uppercase' }}>Cycle {i + 1}</span>
              </div>
              <div style={{ marginTop: 6, font: 'var(--type-meta-sm)', fontVariantNumeric: 'var(--numeric)', color: s.ink }}>{c.detail || s.label}</div>
              {c.duration && <div style={{ marginTop: 2, font: 'var(--type-meta-sm)', fontVariantNumeric: 'var(--numeric)', color: s.ink, opacity: .75 }}>{c.duration}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 'var(--sp-3)', font: 'var(--type-meta-sm)', color: 'var(--text-muted)' }}>
        <span style={{ color: passed === cycles.length && cycles.length ? 'var(--verified-400)' : 'var(--text-body)' }}>{passed}/{cycles.length} verification cycles passed</span>
        {conditions ? ' under the recorded conditions · ' + conditions : ' under the recorded conditions'}
      </div>
    </div>
  );
}
