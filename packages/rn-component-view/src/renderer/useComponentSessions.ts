import { useCallback, useSyncExternalStore } from 'react';
import type { ComponentSessionClient } from '../sessions/createComponentSessionClient';
import type { RNComponentSessionState } from '../types';

export function useComponentSessions(
  client: Pick<ComponentSessionClient, 'getSessions' | 'onSessionsChanged'>
): readonly RNComponentSessionState[] {
  const subscribe = useCallback((listener: () => void) => client.onSessionsChanged(listener).remove, [client]);
  return useSyncExternalStore(subscribe, client.getSessions);
}
