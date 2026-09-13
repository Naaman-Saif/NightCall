import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Button } from '../core/Button.jsx';
import { Textarea } from '../forms/Textarea.jsx';
import { RoleTag } from './RoleTag.jsx';

export function QuestionCard({ question, why, meanwhile, asked, answered, answer, readOnly, onAnswer, style, ...rest }) {
  const [draft, setDraft] = React.useState('');
  return (
    <div style={{
      padding: 'var(--card-pad)', background: 'var(--surface-card)',
      border: '1px solid ' + (answered ? 'var(--line-soft)' : 'var(--beacon-600)'),
      borderRadius: 'var(--radius-md)', ...style,
    }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
        <RoleTag role="lead" />
        <span style={{ color: 'var(--night-600)' }}>·</span>
        <span style={{ font: 'var(--type-meta-sm)', color: 'var(--text-faint)' }}>{asked}</span>
        {answered && <Icon name="check" size={13} style={{ color: 'var(--verified-400)', marginLeft: 'auto' }} />}
      </div>
      <div style={{ font: 'var(--type-subheading)', color: 'var(--text-title)', lineHeight: 'var(--lh-snug)' }}>{question}</div>
      {why && <div style={{ marginTop: 5, font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{why}</div>}
      {meanwhile && (
        <div style={{ marginTop: 'var(--sp-2)', font: 'var(--type-meta-sm)', color: 'var(--text-faint)' }}>Meanwhile: {meanwhile}</div>
      )}
      {answered ? (
        <div style={{ marginTop: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--surface-inset)', borderLeft: '2px solid var(--verified-400)', borderRadius: 'var(--radius-xs)', font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
          {answer}
        </div>
      ) : readOnly ? (
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 6, font: 'var(--type-meta-sm)', color: 'var(--text-faint)' }}>
          <Icon name="lock" size={12} />Answering requires developer access
        </div>
      ) : (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Answer in one line if you can" hint="Private to you and the investigation. Not shown in the public projection." />
          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            <Button size="sm" variant="primary" icon="send" disabled={!draft.trim()} onClick={() => { onAnswer && onAnswer(draft); setDraft(''); }}>Send answer</Button>
            <Button size="sm" variant="ghost">Skip</Button>
          </div>
        </div>
      )}
    </div>
  );
}
