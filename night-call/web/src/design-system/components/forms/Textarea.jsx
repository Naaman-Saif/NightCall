import React from 'react';

export function Textarea({ label, hint, error, rows = 4, numeric, style, wrapperStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'block', ...wrapperStyle }}>
      {label && <div style={{ font: 'var(--type-label)', color: 'var(--text-body)', marginBottom: 'var(--sp-2)' }}>{label}</div>}
      <textarea
        rows={rows}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          display: 'block', width: '100%', padding: 'var(--sp-3)', resize: 'vertical',
          background: 'var(--surface-inset)',
          border: '1px solid ' + (error ? 'var(--critical-400)' : focus ? 'var(--accent)' : 'var(--line)'),
          borderRadius: 'var(--radius-sm)', outline: 'none',
          boxShadow: focus ? '0 0 0 2px var(--focus-ring)' : 'none',
          color: 'var(--text-title)', fontFamily: 'var(--font-core)', fontVariantNumeric: numeric ? 'var(--numeric)' : 'normal',
          fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-normal)',
          transition: 'var(--transition-control)', ...style,
        }}
        {...rest}
      />
      {(hint || error) && (
        <div style={{ marginTop: 6, font: 'var(--type-meta-sm)', color: error ? 'var(--critical-400)' : 'var(--text-muted)' }}>{error || hint}</div>
      )}
    </label>
  );
}
