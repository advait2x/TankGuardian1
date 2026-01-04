import React, { createContext, useContext, useState, ReactNode } from 'react';

type MascotVariant = 'happy' | 'checklist' | 'search' | 'guide' | null;
type MascotPosition = 'top-right' | 'bottom-right' | 'mid-right';

interface MascotState {
  variant: MascotVariant;
  position: MascotPosition;
  tipText?: string;
  duration?: number; // 0 = permanent
}

interface MascotContextType {
  showMascot: (variant: MascotVariant, position?: MascotPosition, tipText?: string, duration?: number) => void;
  hideMascot: () => void;
  state: MascotState;
}

const MascotContext = createContext<MascotContextType | undefined>(undefined);

export { MascotContext };

export function MascotProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MascotState>({
    variant: null,
    position: 'bottom-right',
  });

  const showMascot = (
    variant: MascotVariant,
    position: MascotPosition = 'bottom-right',
    tipText?: string,
    duration?: number
  ) => {
    setState({ variant, position, tipText, duration });
  };

  const hideMascot = () => {
    setState({ variant: null, position: 'bottom-right' });
  };

  return (
    <MascotContext.Provider value={{ showMascot, hideMascot, state }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  const context = useContext(MascotContext);
  if (!context) {
    throw new Error('useMascot must be used within MascotProvider');
  }
  return context;
}

