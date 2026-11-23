export type AppRequest = `${string}/${string}`;

export interface MicroFrontendBundleRequest {
  readonly appName: string;
}

export interface MicroFrontendBundle {
  /** An absolute local file path, or an Android `assets://` locator for a packaged bundle. */
  readonly filePath: string;
}

export interface MicroFrontendAppProps {
  readonly scheme: string;
}

export interface MicroFrontendAdapter {
  readonly loadBundle: (request: MicroFrontendBundleRequest) => Promise<MicroFrontendBundle>;
}

export type MicroFrontendRuntimeEvent =
  | {
      readonly name: 'preloadApp';
      readonly params: { readonly appName: string };
    }
  | {
      readonly name: 'openApp';
      readonly params: {
        readonly sessionId: string;
        readonly appName: string;
        readonly scheme: string;
      };
    }
  | {
      readonly name: 'closeApp';
      readonly params: { readonly sessionId: string };
    }
  | {
      readonly name: 'sessionVisibilityChanged';
      readonly params: {
        readonly sessionId: string;
        readonly isVisible: boolean;
      };
    };

export type MicroFrontendSessionEvent = Exclude<MicroFrontendRuntimeEvent, { readonly name: 'preloadApp' }>;

export interface MicroFrontendRuntimeEventSubscription {
  readonly remove: () => void;
}

export interface MicroFrontendSessionState {
  readonly appName: string;
  readonly sessionId: string;
  readonly scheme: string;
  readonly isVisible: boolean;
}

export interface MicroFrontendLifecycleSession {
  readonly appName: string;
  readonly id: string;
}

export interface MicroFrontendLifecycleEvent {
  readonly phase: 'mounted' | 'unmounted';
  readonly session: MicroFrontendLifecycleSession;
  /** Active sessions across every app when the callback is emitted. */
  readonly activeSessions: readonly MicroFrontendLifecycleSession[];
}

export type MicroFrontendLifecycleCallback = (event: MicroFrontendLifecycleEvent) => void;

/** Another instance of an app: a full copy of its bundle's modules, with its own module state and `evalId`. */
export interface MicroFrontendAppInstance<TModule> {
  readonly evalId: string;
  readonly module: TModule;
}

export interface MicroFrontendRuntimeApi {
  readonly evaluateScript: (filePath: string) => Promise<void>;
  readonly preloadApp: (appName: string) => Promise<void>;
  readonly importApp: <TModule>(request: AppRequest) => Promise<TModule>;
  /**
   * Makes a new instance of the app and returns the module it exposes. The app is evaluated first if needed (that
   * evaluation is its first instance, which `importApp` returns). Each call runs the bundle's modules again from
   * the container definition kept at evaluation, without reading the bundle file. Requires a bundle built with
   * `containerInit()` and a native runtime that passes the evaluation argument
   * (`ContainerDefinitionNotFoundError` otherwise).
   */
  readonly instantiateApp: <TModule>(request: AppRequest) => Promise<MicroFrontendAppInstance<TModule>>;
  /** Read the current snapshot without starting event delivery. */
  readonly getSessions: () => readonly MicroFrontendSessionState[];
  /** Subscribe to changes and start native delivery if needed; read getSessions() for the initial snapshot. */
  readonly onSessionsChanged: (
    listener: (sessions: readonly MicroFrontendSessionState[]) => void
  ) => MicroFrontendRuntimeEventSubscription;
  readonly onEvent: (listener: (event: MicroFrontendSessionEvent) => void) => MicroFrontendRuntimeEventSubscription;
}
