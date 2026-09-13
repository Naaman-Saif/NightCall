import React from 'react';
import { DemoBadge } from './DemoBadge.jsx';

const LEVELS = { error: 'var(--critical-400)', warn: 'var(--beacon-300)', info: 'var(--observed-400)', debug: 'var(--text-faint)' };

export function LogView({ lines = [], title, source, maxHeight = 200, demo = true, style, ...rest }) {
  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', ...style }} {...rest}>
      {(title || source || demo) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '6px var(--sp-3)', borderBottom: '1px solid var(--line-hairline)' }}>
          <span style={{ flex: 1, minWidth: 0, font: 'var(--type-meta-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}{title && source ? ' · ' : ''}{source}
          </span>
          {demo && <DemoBadge />}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{ maxHeight, overflowY: 'auto', padding: 'var(--sp-2) var(--sp-3) var(--sp-4)' }}>
          {lines.map((l, i) => {
            const level = typeof l === 'string' ? null : l.level;
            const text = typeof l === 'string' ? l : l.text;
            const ts = typeof l === 'string' ? null : l.ts;
            return (
              <div key={i} style={{ display: 'flex', gap: 'var(--sp-3)', padding: '2px 0', font: 'var(--type-meta-sm)', fontVariantNumeric: 'var(--numeric)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {ts && <span style={{ color: 'var(--text-faint)', flex: '0 0 auto' }}>{ts}</span>}
                {level && <span style={{ color: LEVELS[level] || 'var(--text-faint)', flex: '0 0 auto', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', fontWeight: 'var(--fw-semibold)', whiteSpace: 'nowrap', width: 54 }}>{level}</span>}
                <span style={{ color: level === 'error' ? 'var(--text-title)' : 'var(--text-body)' }}>{text}</span>
              </div>
            );
          })}
        </div>
        {/* The one permitted alpha in the system: a fade mask over scrolling evidence, not a control ground. */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 28, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(12,18,16,0), var(--surface-inset))' }} />
      </div>
    </div>
  );
}
