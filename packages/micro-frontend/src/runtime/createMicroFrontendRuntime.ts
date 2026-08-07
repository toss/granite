import type {
  AppRequest,
  MicroFrontendAdapter,
  MicroFrontendRuntimeApi,
  MicroFrontendRuntimeEvent,
  MicroFrontendRuntimeEventSubscription,
} from '../types';
import { AppContainerNotFoundError, InvalidAppNameError } from './errors';
import { parseAppRequest } from './parseAppRequest';

export interface NativeMicroFrontendRuntimeEvent {
  readonly name: string;
  readonly params: {
    readonly appName?: string;
    readonly requestId?: string;
    readonly sessionId?: string;
    readonly scheme?: string;
    readonly isVisible?: boolean;
  };
}

export interface NativeMicroFrontendRuntime {
  readonly evaluateScript: (request: { readonly filePath: string }) => Promise<void>;
  readonly requestCloseSession: (request: { readonly sessionId: string }) => Promise<void>;
  readonly completePreloadApp: (request: {
    readonly requestId: string;
    readonly errorMessage: string | null;
  }) => void;
  readonly startEventDelivery: () => void;
  readonly onEvent: (
    listener: (event: NativeMicroFrontendRuntimeEvent) => void
  ) => MicroFrontendRuntimeEventSubscription;
}

export interface MicroFrontendModuleRegistry {
  readonly hasContainer: (appName: string) => boolean;
  readonly removeContainer: (appName: string) => void;
  readonly importModule: <TModule>(request: AppRequest) => TModule;
}

export interface CreateMicroFrontendRuntimeDependencies {
  readonly adapter: MicroFrontendAdapter;
  readonly nativeRuntime: NativeMicroFrontendRuntime;
  readonly registry: MicroFrontendModuleRegistry;
  readonly parseEvent: (event: NativeMicroFrontendRuntimeEvent) => MicroFrontendRuntimeEvent;
}

export function createMicroFrontendRuntimeWithDependencies(
  dependencies: CreateMicroFrontendRuntimeDependencies
): MicroFrontendRuntimeApi {
  // A fulfilled promise is the evaluated-state cache. Rejected evaluations remove themselves.
  const appEvaluations = new Map<string, Promise<void>>();

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

  async function evaluateApp(appName: string): Promise<void> {
    try {
      const filePath = await dependencies.adapter.loadBundle(appName);
      await dependencies.nativeRuntime.evaluateScript({ filePath });

      if (!dependencies.registry.hasContainer(appName)) {
        throw new AppContainerNotFoundError(appName);
      }
    } catch (error) {
      dependencies.registry.removeContainer(appName);
      appEvaluations.delete(appName);
      throw error;
    }
  }

  function completeNativePreloadRequest(event: NativeMicroFrontendRuntimeEvent) {
    if (event.name !== 'preloadApp') {
      return;
    }

    const { appName, requestId } = event.params;
    if (typeof appName !== 'string' || appName.length === 0 || typeof requestId !== 'string' || requestId.length === 0) {
      return;
    }

    void preloadApp(appName).then(
      () => dependencies.nativeRuntime.completePreloadApp({ requestId, errorMessage: null }),
      (error: unknown) =>
        dependencies.nativeRuntime.completePreloadApp({
          requestId,
          errorMessage: error instanceof Error ? error.message : String(error),
        })
    );
  }

  return {
    evaluateScript: (filePath) => dependencies.nativeRuntime.evaluateScript({ filePath }),
    preloadApp,
    async importApp<TModule>(request: AppRequest): Promise<TModule> {
      const { appName } = parseAppRequest(request);
      await preloadApp(appName);
      return dependencies.registry.importModule<TModule>(request);
    },
    closeSession: (sessionId) => dependencies.nativeRuntime.requestCloseSession({ sessionId }),
    onEvent(listener) {
      const subscription = dependencies.nativeRuntime.onEvent((event) => {
        completeNativePreloadRequest(event);
        listener(dependencies.parseEvent(event));
      });
      dependencies.nativeRuntime.startEventDelivery();
      return subscription;
    },
  };
}
