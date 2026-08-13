import { VisibilityChangedProvider } from '@granite-js/react-native';
import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';

export interface MicroFrontendSession {
  readonly sessionId: string;
}

export interface MicroFrontendSessionProviderProps extends MicroFrontendSession {
  readonly children: ReactNode;
  readonly presentationVisibility: boolean;
}

const MicroFrontendSessionContext = createContext<MicroFrontendSession | null>(null);

export class MissingMicroFrontendSessionError extends Error {
  constructor() {
    super('useMicroFrontendSession must be used inside MicroFrontendSessionProvider');
    this.name = 'MissingMicroFrontendSessionError';
  }
}

export function MicroFrontendSessionProvider(props: MicroFrontendSessionProviderProps): ReactElement {
  const value = useMemo<MicroFrontendSession>(
    () => ({
      sessionId: props.sessionId,
    }),
    [props.sessionId]
  );

  return (
    <MicroFrontendSessionContext.Provider value={value}>
      <VisibilityChangedProvider isVisible={props.presentationVisibility}>
        {props.children}
      </VisibilityChangedProvider>
    </MicroFrontendSessionContext.Provider>
  );
}

export function useMicroFrontendSession(): MicroFrontendSession {
  const session = useContext(MicroFrontendSessionContext);
  if (session == null) {
    throw new MissingMicroFrontendSessionError();
  }
  return session;
}
