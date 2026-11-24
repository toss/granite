import { openPendingHostComponentSession, closePendingHostComponentSession } from '../host/pendingHostComponentStore';
import type {
  AppRequest,
  MicroFrontendAdapter,
  MicroFrontendImportOptions,
  MicroFrontendLifecycleEvent,
  MicroFrontendRuntimeApi,
  MicroFrontendRuntimeEvent,
  MicroFrontendRuntimeEventSubscription,
  MicroFrontendSessionEvent,
  MicroFrontendSessionState,
} from '../types';
import { withPendingOwner } from './appInstances';
import { AppContainerNotFoundError, InvalidAppNameError } from './errors';
import { getMicroFrontendGlobalContext } from './globalContext';
import { setMicroFrontendLifecycleCallback } from './lifecycle';
import { installNativeComponentRegistryCompatibility } from './nativeComponentRegistryCompatibility';
import { parseAppRequest } from './parseAppRequest';
import { createSessionStore } from './sessionStore';
import { setSessionUnmountHandler } from './sessionUnmount';

export interface NativeMicroFrontendRuntimeEvent {
  readonly name: string;
  readonly params: {
    readonly appName?: string;
    readonly sessionId?: string;
    readonly scheme?: string;
    readonly isVisible?: boolean;
  };
}

export interface NativeMicroFrontendRuntime {
  readonly evaluateScript: (request: { readonly filePath: string }) => Promise<void>;
  readonly startEventDelivery: () => void;
  /** The closed session's React tree has unmounted. Optional: older native runtimes do not implement it. */
  readonly sessionDidUnmount?: (sessionId: string) => void;
  readonly onEvent: (
    listener: (event: NativeMicroFrontendRuntimeEvent) => void
  ) => MicroFrontendRuntimeEventSubscription;
}

export interface MicroFrontendModuleRegistry {
  readonly hasContainer: (appName: string) => boolean;
  readonly removeContainer: (appName: string) => void;
  readonly importModule: <TModule>(request: AppRequest) => TModule;
  /** Instance per session. Optional: without it every session gets the app's only instance. */
  readonly importSessionModule?: <TModule>(
    request: AppRequest,
    session: { readonly sessionId: string; readonly isOpen: () => boolean }
  ) => TModule;
  /** After a native preload, leave one instance of the app that no session has used yet. */
  readonly prepareUnusedInstance?: (appName: string) => void;
}

export interface CreateMicroFrontendRuntimeDependencies {
  readonly adapter: MicroFrontendAdapter;
  readonly nativeRuntime: NativeMicroFrontendRuntime;
  readonly onPreloadError: (error: unknown) => void;
  /** Whether each session gets its own app instance (see appInstances.ts). Read on each import and preload. */
  readonly instancePerSession?: () => boolean;
  readonly onLifecycleEvent?: (event: MicroFrontendLifecycleEvent) => void;
  readonly registry: MicroFrontendModuleRegistry;
  readonly removePendingHostComponentRoutes: (appName: string) => void;
  readonly parseEvent: (event: NativeMicroFrontendRuntimeEvent) => MicroFrontendRuntimeEvent;
}

export function createMicroFrontendRuntimeWithDependencies(
  dependencies: CreateMicroFrontendRuntimeDependencies
): MicroFrontendRuntimeApi {
  // A fulfilled promise is the evaluated-state cache. Rejected evaluations remove themselves.
  const appEvaluations = new Map<string, Promise<void>>();
  const sessionStore = createSessionStore();
  const sessionListeners = new Set<(sessions: readonly MicroFrontendSessionState[]) => void>();
  const eventListeners = new Set<(event: MicroFrontendSessionEvent) => void>();
  let nativeSubscription: MicroFrontendRuntimeEventSubscription | undefined;
  // Sessions native has closed whose tree has not unmounted yet. Each is reported to native once.
  const sessionsAwaitingUnmount = new Set<string>();
  // Session imports run one at a time: a session waits for its instance while that instance initializes.
  let sessionImports: Promise<unknown> = Promise.resolve();
  const isInstancePerSession = () => dependencies.instancePerSession?.() === true;

  function startEventDelivery() {
    if (nativeSubscription != null) {
      return;
    }
    nativeSubscription = dependencies.nativeRuntime.onEvent((event) => {
      const parsedEvent = dependencies.parseEvent(event);
      switch (parsedEvent.name) {
        case 'preloadApp': {
          const { appName } = parsedEvent.params;
          void preloadApp(appName)
            .then(() => {
              if (isInstancePerSession()) {
                dependencies.registry.prepareUnusedInstance?.(appName);
              }
            })
            .catch(dependencies.onPreloadError);
          return;
        }
        case 'openApp':
        case 'closeApp':
        case 'sessionVisibilityChanged':
          if (sessionStore.applyEvent(parsedEvent)) {
            if (parsedEvent.name === 'openApp') {
              openPendingHostComponentSession(parsedEvent.params.sessionId);
            }
            if (parsedEvent.name === 'closeApp') {
              sessionsAwaitingUnmount.add(parsedEvent.params.sessionId);
              closePendingHostComponentSession(parsedEvent.params.sessionId);
            }
            notifyListeners(sessionListeners, sessionStore.getSessions());
          }
          notifyListeners(eventListeners, parsedEvent);
          return;
        default: {
          const exhaustiveEvent: never = parsedEvent;
          return exhaustiveEvent;
        }
      }
    });
    dependencies.nativeRuntime.startEventDelivery();
  }

  function resetFailedEvaluation(appName: string) {
    appEvaluations.delete(appName);
    dependencies.registry.removeContainer(appName);
    dependencies.removePendingHostComponentRoutes(appName);
  }

  function preloadApp(appName: string): Promise<void> {
    if (appName.length === 0) {
      return Promise.reject(new InvalidAppNameError(appName));
    }

    const existingEvaluation = appEvaluations.get(appName);
    if (existingEvaluation != null) {
      return existingEvaluation;
    }

    const evaluation = evaluateApp(appName);
    appEvaluations.set(appName, evaluation);
    return evaluation;
  }

  function evaluateScript(filePath: string): Promise<void> {
    getMicroFrontendGlobalContext();
    installNativeComponentRegistryCompatibility();
    return dependencies.nativeRuntime.evaluateScript({ filePath });
  }

  async function evaluateApp(appName: string): Promise<void> {
    try {
      const { filePath } = await dependencies.adapter.loadBundle({ appName });
      await evaluateScript(filePath);

      if (!dependencies.registry.hasContainer(appName)) {
        throw new AppContainerNotFoundError(appName);
      }
    } catch (error) {
      resetFailedEvaluation(appName);
      throw error;
    }
  }

  const runtime: MicroFrontendRuntimeApi = {
    evaluateScript,
    preloadApp,
    async importApp<TModule>(request: AppRequest, options?: MicroFrontendImportOptions): Promise<TModule> {
      const { appName } = parseAppRequest(request);
      const sessionId = options?.sessionId;
      const importSessionModule = dependencies.registry.importSessionModule;
      if (sessionId == null || importSessionModule == null || !isInstancePerSession()) {
        await preloadApp(appName);
        return dependencies.registry.importModule<TModule>(request);
      }
      const run = async (): Promise<TModule> => {
        // An evaluation that starts now belongs to this session from its first module on.
        await withPendingOwner(appName, sessionId, () => preloadApp(appName));
        return importSessionModule<TModule>(request, {
          sessionId,
          isOpen: () => sessionStore.getSessions().some((session) => session.sessionId === sessionId),
        });
      };
      const result = sessionImports.then(run, run);
      sessionImports = result.catch(() => undefined);
      return result;
    },
    getSessions: sessionStore.getSessions,
    onSessionsChanged(listener) {
      const callback = (sessions: readonly MicroFrontendSessionState[]) => listener(sessions);
      sessionListeners.add(callback);
      startEventDelivery();
      return { remove: () => sessionListeners.delete(callback) };
    },
    onEvent(listener) {
      const callback = (event: MicroFrontendSessionEvent) => listener(event);
      eventListeners.add(callback);
      startEventDelivery();
      return { remove: () => eventListeners.delete(callback) };
    },
  };

  setMicroFrontendLifecycleCallback(runtime, dependencies.onLifecycleEvent);
  setSessionUnmountHandler(runtime, (sessionId) => {
    if (sessionsAwaitingUnmount.delete(sessionId)) {
      dependencies.nativeRuntime.sessionDidUnmount?.(sessionId);
    }
  });

  return runtime;
}

function notifyListeners<TEvent>(listeners: ReadonlySet<(event: TEvent) => void>, event: TEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('Failed to run a micro-frontend runtime listener', error);
    }
  });
}
