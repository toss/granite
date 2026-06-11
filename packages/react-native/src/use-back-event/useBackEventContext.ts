import { useContext, useMemo } from 'react';
import {
  BackEventActionsContext,
  BackEventStateContext,
  type PrivateBackEventControls,
} from './BackEventContext';

export function useBackEventContext() {
  const actions = useContext(BackEventActionsContext);
  const state = useContext(BackEventStateContext);

  const context = useMemo((): PrivateBackEventControls | null => {
    if (actions == null || state == null) {
      return null;
    }

    return {
      ...actions,
      ...state,
    };
  }, [actions, state]);

  if (context == null) {
    throw new Error('useBackEvent must be used within a BackEventProvider');
  }

  return context;
}
