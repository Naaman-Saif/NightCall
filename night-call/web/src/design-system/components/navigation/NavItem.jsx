import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function NavItem({ icon, label, active, badge, collapsed, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button" onClick={onClick} title={collapsed ? label : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%',
        height: collapsed ? 38 : 32, padding: collapsed ? 0 : '0 var(--sp-3)',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? 'var(--surface-selected)' : hover ? 'var(--surface-hover)' : 'transparent',
        border: 'none', borderLeft: collapsed ? 'none' : '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
        borderRadius: collapsed ? 'var(--radius-sm)' : 'var(--radius-xs)',
        color: active ? 'var(--text-title)' : 'var(--text-muted)',
        fontFamily: 'var(--font-core)', fontSize: 'var(--text-sm)',
        fontWeight: active ? 'var(--fw-medium)' : 'var(--fw-regular)',
        cursor: 'pointer', textAlign: 'left', transition: 'var(--transition-control)', ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={collapsed ? 18 : 15} style={{ color: active ? 'var(--accent)' : 'inherit' }} />}
      {!collapsed && <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
      {!collapsed && badge != null && <span style={{ font: 'var(--type-meta-sm)', color: 'var(--text-faint)' }}>{badge}</span>}
    </button>
  );
}
