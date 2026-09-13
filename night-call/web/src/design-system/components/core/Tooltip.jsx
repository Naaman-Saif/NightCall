import React from 'react';

export function Tooltip({ content, side = 'top', children, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const pos = side === 'top' ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }
    : side === 'bottom' ? { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 }
    : side === 'left' ? { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 }
    : { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 };
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} {...rest}
    >
      {children}
      {open && (
        <span role="tooltip" style={{
          position: 'absolute', zIndex: 50, ...pos, padding: '5px 8px',
          background: 'var(--night-700)', border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          color: 'var(--text-title)', font: 'var(--type-meta-sm)', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{content}</span>
      )}
    </span>
  );
}
