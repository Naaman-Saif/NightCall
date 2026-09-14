import { createContext, useContext, useState, type ReactNode } from 'react';

const MotionContext = createContext({ enabled: true, toggle: () => {} });

function initialMotion() {
  try { return localStorage.getItem('nightcall.mascot-motion') !== 'off'; }
  catch { return true; }
}

function saveMotion(enabled: boolean) {
  try { localStorage.setItem('nightcall.mascot-motion', enabled ? 'on' : 'off'); }
  catch { return; }
}

export function MascotMotionProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(initialMotion);
  const toggle = () => {
    saveMotion(!enabled);
    setEnabled(!enabled);
  };
  return <MotionContext.Provider value={{ enabled, toggle }}>{children}</MotionContext.Provider>;
}

export function useMascotMotion() {
  return useContext(MotionContext);
}

export function MascotMotionControl() {
  const { enabled, toggle } = useMascotMotion();
  return (
    <button className="mascot-motion-control" onClick={toggle} aria-pressed={!enabled}>
      {enabled ? 'Pause mascot' : 'Resume mascot'}
    </button>
  );
}
