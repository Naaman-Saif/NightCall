import { createContext, useContext, type ReactNode } from 'react';

const MotionContext = createContext({ enabled: true });

export function MascotMotionProvider({ children }: { children: ReactNode }) {
  return <MotionContext.Provider value={{ enabled: true }}>{children}</MotionContext.Provider>;
}

export function useMascotMotion() {
  return useContext(MotionContext);
}
