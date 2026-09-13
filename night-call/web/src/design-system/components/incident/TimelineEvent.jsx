import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { RoleTag, ROLES } from './RoleTag.jsx';
import { Tooltip } from '../core/Tooltip.jsx';

export function TimelineEvent({ role = 'lead', title, time, absoluteTime, running, last, children, meta, onOpen, style, ...rest }) {
  const r = ROLES[role] || ROLES.lead;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 'var(--sp-3)', ...style }} {...rest}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
          flex: '0 0 auto', borderRadius: 'var(--radius-sm)', background: 'var(--surface-raised)',
          border: '1px solid ' + (running ? 'var(--beacon-500)' : 'var(--line)'), color: r.color,
          boxShadow: running ? 'var(--shadow-glow-accent)' : 'none',
        }}><Icon name={r.icon} size={14} /></span>
        {!last && <span style={{ flex: 1, width: 1, background: 'var(--line-soft)', marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 'var(--sp-5)', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <RoleTag role={role} />
          <span style={{ color: 'var(--night-600)' }}>·</span>
          {absoluteTime
            ? <Tooltip content={absoluteTime}><span style={{ font: 'var(--type-meta-sm)', color: 'var(--text-faint)', borderBottom: '1px dotted var(--night-600)', cursor: 'default' }}>{time}</span></Tooltip>
            : <span style={{ font: 'var(--type-meta-sm)', color: 'var(--text-faint)' }}>{time}</span>}
          {running && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: 'var(--type-meta-sm)', color: 'var(--beacon-300)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--beacon-400)', animation: 'nc-pulse var(--dur-pulse) ease-in-out infinite' }} />
              running
            </span>
          )}
        </div>
        <div style={{ marginTop: 5, font: 'var(--type-subheading)', color: 'var(--text-title)' }}>{title}</div>
        {children && <div style={{ marginTop: 5, font: 'var(--type-body-sm)', color: 'var(--text-body)', maxWidth: '72ch' }}>{children}</div>}
        {meta && <div style={{ marginTop: 'var(--sp-3)' }}>{meta}</div>}
        {onOpen && (
          <button type="button" onClick={onOpen} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 'var(--sp-3)', padding: 0,
            background: 'none', border: 'none', color: 'var(--text-link)', font: 'var(--type-meta-sm)', cursor: 'pointer',
          }}>Inspect<Icon name="arrow-right" size={12} /></button>
        )}
      </div>
    </div>
  );
}
