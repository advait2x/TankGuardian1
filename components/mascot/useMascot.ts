import { useContext } from 'react';
import { MascotContext } from './MascotContext';

export function useMascot() {
  const context = useContext(MascotContext);
  if (!context) {
    // Fail-safe: if context not available, return no-op functions
    console.warn('useMascot: MascotContext not available, returning no-op functions');
    return {
      showMascot: () => {},
      hideMascot: () => {},
      state: { variant: null, position: 'bottom-right' as const },
    };
  }
  return context;
}

