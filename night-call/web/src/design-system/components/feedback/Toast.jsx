import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { IconButton } from '../core/IconButton.jsx';

const TONES = {
  neutral: ['var(--text-title)', 'circle-check'],
  verified: ['var(--verified-400)', 'shield-check'],
  critical: ['var(--critical-400)', 'triangle-alert'],
};

export function Toast({ tone = 'neutral', title, children, onDismiss, action, style, ...rest }) {
  const [fg, glyph] = TONES[tone] || TONES.neutral;
  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', width: 360, padding: 'var(--sp-3)',
      background: 'var(--night-800)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-md)', ...style,
    }} {...rest}>
      <Icon name={glyph} size={16} style={{ color: fg, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: 'var(--type-label)', color: 'var(--text-title)' }}>{title}</div>
        {children && <div style={{ marginTop: 3, font: 'var(--type-meta-sm)', color: 'var(--text-muted)' }}>{children}</div>}
        {action && <div style={{ marginTop: 'var(--sp-2)' }}>{action}</div>}
      </div>
      {onDismiss && <IconButton icon="x" size="sm" label="Dismiss" onClick={onDismiss} />}
    </div>
  );
}
