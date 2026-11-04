import { VisibilityChangedProvider } from '@granite-js/react-native';
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type Context, type ReactElement, type ReactNode } from 'react';
import { getExecutionSessions, SESSION_EXECUTION_TOKEN } from '../execution/sessions';
import { getMicroFrontendGlobalContext, MicroFrontendGlobalContextCompatibilityError } from '../runtime/globalContext';

export interface MicroFrontendSession {
  readonly sessionId: string;
}

export interface MicroFrontendSessionProviderProps extends MicroFrontendSession {
  readonly children: ReactNode;
  readonly presentationVisibility: boolean;
}

const SESSION_CONTEXT_KEY = 'microFrontendSessionContext';

function getSessionContext(): Context<MicroFrontendSession | null> {
  const globalContext = getMicroFrontendGlobalContext();
  const descriptor = Reflect.getOwnPropertyDescriptor(globalContext, SESSION_CONTEXT_KEY);
  if (descriptor != null) {
    const value = descriptor.value;
    if (typeof value !== 'object' || value == null || value.Provider == null || value.Consumer == null) {
      throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-not-adoptable');
    }
    return value;
  }

  // Host and remote bundles share React, but may evaluate separate copies of this package.
  const context = createContext<MicroFrontendSession | null>(null);
  if (!Reflect.defineProperty(globalContext, SESSION_CONTEXT_KEY, { value: context, enumerable: false })) {
    throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-not-adoptable');
  }
  return context;
}

export class MissingMicroFrontendSessionError extends Error {
  constructor() {
    super('useMicroFrontendSession must be used inside MicroFrontendSessionProvider');
    this.name = 'MissingMicroFrontendSessionError';
  }
}

export function MicroFrontendSessionProvider(props: MicroFrontendSessionProviderProps): ReactElement {
  const MicroFrontendSessionContext = getSessionContext();
  const executions = getExecutionSessions();
  const subscribe = useCallback((listener: () => void) => executions.subscribe(props.sessionId, listener), [executions, props.sessionId]);
  const getSnapshot = useCallback(() => executions.get(props.sessionId), [executions, props.sessionId]);
  const execution = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const value = useMemo<MicroFrontendSession>(
    () => Object.defineProperty({ sessionId: props.sessionId }, SESSION_EXECUTION_TOKEN, { value: execution }),
    [props.sessionId, execution]
  );

  return (
    <MicroFrontendSessionContext.Provider value={value}>
      <VisibilityChangedProvider isVisible={props.presentationVisibility}>{props.children}</VisibilityChangedProvider>
    </MicroFrontendSessionContext.Provider>
  );
}

export function useMicroFrontendSession(): MicroFrontendSession {
  const session = useContext(getSessionContext());
  if (session == null) {
    throw new MissingMicroFrontendSessionError();
  }
  return session;
}
