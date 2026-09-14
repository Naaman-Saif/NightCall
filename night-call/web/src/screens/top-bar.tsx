export function TopBar() {
  return (
    <header className="top-bar">
      <a className="wordmark" href="/incidents">
        <svg className="brand-moon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M15 1a11 11 0 1 0 8 17A11 11 0 0 1 15 1Z" />
        </svg>
        <span>nightcall</span>
      </a>
    </header>
  );
}
