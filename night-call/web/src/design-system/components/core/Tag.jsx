import React from 'react';
import { Icon } from './Icon.jsx';

export function Tag({ children, icon, onRemove, selected, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!onClick;
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 9px',
        borderRadius: 'var(--radius-pill)',
        background: selected ? 'var(--fill-accent)' : hover && interactive ? 'var(--surface-raised)' : 'var(--fill-neutral)',
        border: '1px solid transparent',
        color: selected ? 'var(--on-solid)' : 'var(--text-body)',
        font: 'var(--type-meta-sm)', fontWeight: selected ? 'var(--fw-semibold)' : 'var(--fw-regular)',
        fontVariantNumeric: 'var(--numeric)', cursor: interactive ? 'pointer' : 'default',
        transition: 'var(--transition-control)', ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
      {onRemove && (
        <Icon name="x" size={12} style={{ opacity: 0.6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onRemove(); }} />
      )}
    </span>
  );
}
