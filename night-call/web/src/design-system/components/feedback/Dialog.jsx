import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

export function Dialog({ open = true, title, eyebrow, footer, onClose, width = 520, children, style, ...rest }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--scrim)', backdropFilter: 'var(--blur-overlay)', padding: 'var(--sp-6)',
    }} onClick={onClose}>
      <div
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column',
          background: 'var(--surface-panel)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', ...style,
        }}
        {...rest}
      >
        <header style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', padding: 'var(--panel-pad)', borderBottom: '1px solid var(--line-hairline)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <div style={{ font: 'var(--type-eyebrow)', letterSpacing: 'var(--track-caps)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>{eyebrow}</div>}
            <h2 style={{ font: 'var(--type-title)', fontSize: 'var(--text-xl)', letterSpacing: 'var(--track-tight)' }}>{title}</h2>
          </div>
          {onClose && <IconButton icon="x" label="Close" onClick={onClose} />}
        </header>
        <div style={{ padding: 'var(--panel-pad)', overflowY: 'auto', font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>{children}</div>
        {footer && (
          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', padding: 'var(--sp-3) var(--panel-pad)', borderTop: '1px solid var(--line-hairline)', background: 'var(--surface-card)' }}>{footer}</footer>
        )}
      </div>
    </div>
  );
}
