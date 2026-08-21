import type {
  AppRequest,
  MicroFrontendAdapter,
  MicroFrontendRuntimeApi,
  MicroFrontendRuntimeEvent,
  MicroFrontendRuntimeEventSubscription,
} from '../types';
import { AppContainerNotFoundError, InvalidAppNameError } from './errors';
import { getMicroFrontendGlobalContext } from './globalContext';
import { parseAppRequest } from './parseAppRequest';

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
  readonly onPreloadError: (error: unknown) => void;
  readonly registry: MicroFrontendModuleRegistry;
  readonly removePendingHostComponentRoutes: (appName: string) => void;
  readonly parseEvent: (event: NativeMicroFrontendRuntimeEvent) => MicroFrontendRuntimeEvent;
}

export function createMicroFrontendRuntimeWithDependencies(
  dependencies: CreateMicroFrontendRuntimeDependencies
): MicroFrontendRuntimeApi {
  // A fulfilled promise is the evaluated-state cache. Rejected evaluations remove themselves.
  const appEvaluations = new Map<string, Promise<void>>();

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

  return {
    evaluateScript,
    preloadApp,
    async importApp<TModule>(request: AppRequest): Promise<TModule> {
      const { appName } = parseAppRequest(request);
      await preloadApp(appName);
      return dependencies.registry.importModule<TModule>(request);
    },
    onEvent(listener) {
      const subscription = dependencies.nativeRuntime.onEvent((event) => {
        const parsedEvent = dependencies.parseEvent(event);
        switch (parsedEvent.name) {
          case 'preloadApp':
            void preloadApp(parsedEvent.params.appName).catch(dependencies.onPreloadError);
            return;
          case 'openApp':
          case 'closeApp':
          case 'sessionVisibilityChanged':
            listener(parsedEvent);
            return;
          default: {
            const exhaustiveEvent: never = parsedEvent;
            return exhaustiveEvent;
          }
        }
      });
      dependencies.nativeRuntime.startEventDelivery();
      return subscription;
    },
  };
}
