import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { ClaimLabel } from './ClaimLabel.jsx';
import { DemoBadge } from './DemoBadge.jsx';

const LABEL = {
  font: 'var(--type-eyebrow)', letterSpacing: 'var(--track-caps)', textTransform: 'uppercase',
  color: 'var(--text-muted)', marginBottom: 'var(--sp-2)',
};

function Block({ label, aside, children, first }) {
  return (
    <section style={{
      padding: first ? 0 : 'var(--sp-4) 0 0',
      marginTop: first ? 0 : 'var(--sp-4)',
      borderTop: first ? 'none' : '1px solid var(--line-hairline)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <div style={{ ...LABEL, marginBottom: 'var(--sp-2)', flex: aside ? 1 : 'none' }}>{label}</div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Readout({ label, value, caption, tone }) {
  const fill = tone === 'critical' ? 'var(--fill-critical)' : tone === 'verified' ? 'var(--fill-verified)' : 'var(--fill-neutral)';
  const ink = tone ? 'var(--on-solid)' : 'var(--on-solid-neutral)';
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ font: 'var(--type-meta-sm)', color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
      <div style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: '4px 10px',
        background: fill, color: ink, borderRadius: 'var(--radius-sm)',
        font: 'var(--type-metric)', fontSize: 'var(--text-xl)', fontVariantNumeric: 'var(--numeric)',
        letterSpacing: 'var(--track-tight)',
      }}>{value}</div>
      {caption && <div style={{ marginTop: 6, font: 'var(--type-meta-sm)', fontVariantNumeric: 'var(--numeric)', color: 'var(--text-faint)' }}>{caption}</div>}
    </div>
  );
}

/** The eight-second read: what happened, what proves it, what changed, what to do. */
export function StaffSummary({ happened, why, whyClaim = 'hypothesis', whyQualifier, evidence = [], before, after, remedy, claim, qualifier, action, demo = true, style, ...rest }) {
  return (
    <section style={{
      padding: 'var(--panel-pad)', background: 'var(--surface-card)',
      border: '1px solid var(--line-soft)', borderLeft: '3px solid var(--accent)',
      borderRadius: 'var(--radius-md)', ...style,
    }} {...rest}>
      <Block first label="What happened" aside={demo ? <DemoBadge /> : null}>
        <p style={{ margin: 0, font: 'var(--type-heading)', fontSize: 'var(--text-lg)', lineHeight: 'var(--lh-snug)', color: 'var(--text-title)', maxWidth: '60ch' }}>{happened}</p>
      </Block>

      {why && (
        <Block label="Why">
          <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-body)', maxWidth: '64ch' }}>{why}</p>
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <ClaimLabel claim={whyClaim} size="sm" qualifier={whyQualifier} />
          </div>
        </Block>
      )}

      {evidence.length > 0 && (
        <Block label="What evidence">
          <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            {evidence.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
                <span style={{ flex: '0 0 auto', width: 4, height: 4, marginTop: 7, borderRadius: 'var(--radius-pill)', background: 'var(--text-faint)' }} />
                <span style={{ flex: 1, minWidth: 0, font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>{e.label}</span>
                <span style={{
                  font: 'var(--type-body-sm)', fontWeight: 'var(--fw-semibold)', fontVariantNumeric: 'var(--numeric)',
                  color: e.tone === 'critical' ? 'var(--critical-400)' : e.tone === 'verified' ? 'var(--verified-400)' : 'var(--text-title)',
                  whiteSpace: 'nowrap',
                }}>{e.value}</span>
              </div>
            ))}
          </div>
        </Block>
      )}

      {(before || after) && (
        <Block label="Before / after">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-4)' }}>
            {before && <Readout {...before} tone={before.tone || 'critical'} />}
            {before && after && (
              <Icon name="arrow-right" size={16} style={{ color: 'var(--text-faint)', alignSelf: 'center', marginTop: 14 }} />
            )}
            {after && <Readout {...after} tone={after.tone || 'verified'} />}
          </div>
        </Block>
      )}

      {remedy && (
        <Block label="Remedy">
          <p style={{ margin: 0, font: 'var(--type-body-sm)', color: 'var(--text-body)', maxWidth: '66ch' }}>{remedy}</p>
          {(claim || action) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap', marginTop: 'var(--sp-3)' }}>
              {claim && <ClaimLabel claim={claim} size="sm" qualifier={qualifier} />}
              {action}
            </div>
          )}
        </Block>
      )}
    </section>
  );
}
