import type { NavigationContainerRefWithCurrent, ParamListBase } from '@granite-js/native/@react-navigation/native';
import type { MicroFrontendLifecycleCallback, MicroFrontendLifecycleSession } from '../types';

export interface MicroFrontendSessionHandle extends MicroFrontendLifecycleSession {
  readonly navigation: NavigationContainerRefWithCurrent<ParamListBase>;
  readonly addListener: (event: 'lifecycle', listener: MicroFrontendLifecycleCallback) => () => void;
}

export type MicroFrontendSessionSubscriber = (session: MicroFrontendSessionHandle) => void | (() => void);

export interface MicroFrontendSessions {
  readonly get: (sessionId: string) => MicroFrontendSessionHandle | undefined;
  readonly getSnapshot: () => readonly MicroFrontendSessionHandle[];
  /** Visits existing and future sessions. Returned per-session cleanups run on disposal or unsubscribe. */
  readonly subscribe: (subscriber: MicroFrontendSessionSubscriber) => () => void;
}
