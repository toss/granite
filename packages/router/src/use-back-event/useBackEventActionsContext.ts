import { useContext } from 'react';
import { BackEventActionsContext } from './BackEventContext';

export function useBackEventActionsContext() {
  const context = useContext(BackEventActionsContext);
  if (context == null) {
    throw new Error('useBackEvent must be used within a BackEventProvider');
  }

  return context;
}
