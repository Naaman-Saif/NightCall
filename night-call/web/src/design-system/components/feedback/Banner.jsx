import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* [ink, opaque ground, glyph] — alerts are solid bars, never tinted panels */
const TONES = {
  demo: ['var(--on-solid)', 'var(--fill-reproduced)', 'flask-conical'],
  info: ['var(--on-solid)', 'var(--fill-observed)', 'info'],
  readonly: ['var(--on-solid-neutral)', 'var(--fill-neutral)', 'eye'],
  critical: ['var(--on-solid)', 'var(--fill-critical)', 'triangle-alert'],
};

export function Banner({ tone = 'info', title, children, action, icon, style, ...rest }) {
  const [fg, bg, defIcon] = TONES[tone] || TONES.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)',
      background: bg, border: '1px solid transparent', borderRadius: 'var(--radius-sm)', ...style,
    }} {...rest}>
      <Icon name={icon || defIcon} size={15} style={{ color: fg, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ font: 'var(--type-label)', color: fg, fontWeight: 'var(--fw-semibold)', letterSpacing: tone === 'demo' ? 'var(--track-caps)' : 'var(--track-normal)', textTransform: tone === 'demo' ? 'uppercase' : 'none', fontSize: tone === 'demo' ? 'var(--text-2xs)' : 'var(--text-sm)' }}>{title}</div>}
        {children && <div style={{ marginTop: title ? 4 : 0, font: 'var(--type-body-sm)', color: fg, opacity: 0.82 }}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
