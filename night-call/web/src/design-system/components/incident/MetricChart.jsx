import React from 'react';
import { DemoBadge } from './DemoBadge.jsx';

/** Memory / rate over time with the configured limit drawn in. SVG line, 12% area fill. */
export function MetricChart({ series = [], limit, limitLabel, unit = '', height = 140, xLabel, yMax, color = 'var(--beacon-400)', demo = true, style, ...rest }) {
  const max = yMax != null ? yMax : Math.max(limit || 0, ...series.map((p) => p.y)) * 1.12 || 1;
  const n = series.length;
  const W = 100, H = 100;
  const pt = (p, i) => [(n <= 1 ? 0 : (i / (n - 1)) * W), H - (p.y / max) * H];
  const line = series.map((p, i) => { const [x, y] = pt(p, i); return (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2); }).join(' ');
  const area = n ? line + ' L' + W + ' ' + H + ' L0 ' + H + ' Z' : '';
  const limY = limit != null ? H - (limit / max) * H : null;
  const last = series[n - 1];
  return (
    <div style={{ ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
        <div style={{ font: 'var(--type-metric)', fontVariantNumeric: 'var(--numeric)', letterSpacing: 'var(--track-tight)', color: 'var(--text-title)' }}>
          {last ? last.y : '—'}<span style={{ font: 'var(--type-meta-sm)', color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>
        </div>
        {demo && <DemoBadge />}
      </div>
      <div style={{ position: 'relative', height }}>
        <svg viewBox={'0 0 ' + W + ' ' + H} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="var(--line-hairline)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          ))}
          {area && <path d={area} fill={color} opacity="0.12" />}
          {line && <path d={line} fill="none" stroke={color} strokeWidth="1.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
          {limY != null && <line x1="0" x2={W} y1={limY} y2={limY} stroke="var(--critical-400)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
        </svg>
        {limY != null && (
          <div style={{ position: 'absolute', right: 0, top: (limY / H) * 100 + '%', transform: 'translateY(-50%)', padding: '0 4px', background: 'var(--surface-card)', font: 'var(--type-meta-sm)', color: 'var(--critical-400)' }}>
            {limitLabel || limit + ' ' + unit}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, font: 'var(--type-meta-sm)', fontVariantNumeric: 'var(--numeric)', color: 'var(--text-faint)' }}>
        <span>{series[0] ? series[0].x : ''}</span>
        <span>{xLabel}</span>
        <span>{last ? last.x : ''}</span>
      </div>
    </div>
  );
}
