import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function EmptyState({ icon, title, children, action, compact, style, ...rest }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 'var(--sp-3)', padding: compact ? 'var(--sp-6)' : 'var(--sp-12) var(--sp-6)', textAlign: 'center', ...style,
    }} {...rest}>
      {icon && <Icon name={icon} size={20} style={{ color: 'var(--text-faint)' }} />}
      <div style={{ maxWidth: 420 }}>
        {title && <div style={{ font: 'var(--type-subheading)', color: 'var(--text-body)' }}>{title}</div>}
        {children && <div style={{ marginTop: 4, font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
