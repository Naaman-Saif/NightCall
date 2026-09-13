import { useState, type ReactNode } from 'react';
import { Button } from '../kit';

const DETAILS_OPEN_KEY = 'nightcall.details-open';

function readDetailsOpen(): boolean {
  try {
    return window.localStorage.getItem(DETAILS_OPEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberDetailsOpen(isOpen: boolean): void {
  try {
    window.localStorage.setItem(DETAILS_OPEN_KEY, String(isOpen));
  } catch {
    return;
  }
}

export function DetailsToggle({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(readDetailsOpen);
  const toggle = () => {
    rememberDetailsOpen(!isOpen);
    setOpen(!isOpen);
  };
  return (
    <div className="details" data-open={isOpen}>
      <Button variant="secondary" size="sm" icon={isOpen ? 'minus' : 'plus'} aria-expanded={isOpen} onClick={toggle}>
        {isOpen ? 'Hide details' : 'Show details'}
      </Button>
      {isOpen && <div className="details-body">{children}</div>}
    </div>
  );
}
