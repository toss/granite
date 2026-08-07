import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';

export interface MicroFrontendSession {
  readonly sessionId: string;
  readonly isVisible: boolean;
  readonly close: () => Promise<void>;
}

export interface MicroFrontendSessionProviderProps extends MicroFrontendSession {
  readonly children: ReactNode;
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
      close: props.close,
      isVisible: props.isVisible,
      sessionId: props.sessionId,
    }),
    [props.close, props.isVisible, props.sessionId]
  );

  return <MicroFrontendSessionContext.Provider value={value}>{props.children}</MicroFrontendSessionContext.Provider>;
}

export function useMicroFrontendSession(): MicroFrontendSession {
  const session = useContext(MicroFrontendSessionContext);
  if (session == null) {
    throw new MissingMicroFrontendSessionError();
  }
  return session;
}
