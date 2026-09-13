function changeOf(line: string): 'added' | 'removed' | 'same' {
  if (line.startsWith('+')) return 'added';
  if (line.startsWith('-')) return 'removed';
  return 'same';
}

export function DiffView({ diff }: { diff: string | null }) {
  if (!diff) return null;
  return (
    <pre className="diff-view" aria-label="Proposed change">
      {diff.split('\n').map((line, index) => (
        <span key={`${index}-${line}`} className="diff-line" data-change={changeOf(line)}>
          {line}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}
