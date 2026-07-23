import type { ServiceGlobalGuard } from './serviceGlobalGuard';
import { normalizePath } from './utils';

export interface ServiceBundleFallbackContext {
  readonly request: string;
  readonly serviceKey: string;
  readonly cause: unknown;
}

export interface ServiceBundleLoaderOptions<TModule> {
  readonly evaluate: (request: string) => void | Promise<void>;
  readonly exposeName: string;
  readonly fallback?: (context: ServiceBundleFallbackContext) => TModule | null | Promise<TModule | null>;
  readonly getServiceKey: (request: string) => string | null;
  readonly globalGuard?: ServiceGlobalGuard;
  readonly parseExposedModule: (module: unknown) => TModule | null;
}

export interface ServiceBundleLoader<TModule> {
  load(request: string): Promise<TModule>;
}

export class InvalidServiceRequestError extends Error {
  readonly request: string;

  constructor(request: string) {
    super(`Cannot derive a service key from request: ${request}`);
    this.name = 'InvalidServiceRequestError';
    this.request = request;
  }
}

export class ServiceModuleNotFoundError extends Error {
  readonly exposeName: string;
  readonly serviceKey: string;

  constructor(serviceKey: string, exposeName: string) {
    super(`No newly evaluated container exposed '${exposeName}' for service '${serviceKey}'`);
    this.name = 'ServiceModuleNotFoundError';
    this.exposeName = exposeName;
    this.serviceKey = serviceKey;
  }
}

class DefaultServiceBundleLoader<TModule> implements ServiceBundleLoader<TModule> {
  private readonly contentByService = new Map<string, Promise<TModule>>();
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly options: ServiceBundleLoaderOptions<TModule>) {}

  load(request: string): Promise<TModule> {
    const serviceKey = this.options.getServiceKey(request);
    if (serviceKey == null || serviceKey.length === 0) {
      return Promise.reject(new InvalidServiceRequestError(request));
    }

    const cached = this.contentByService.get(serviceKey);
    if (cached != null) {
      return cached;
    }

    const loading = this.enqueue(() => this.evaluateAndResolve(request, serviceKey));
    this.contentByService.set(serviceKey, loading);
    void loading.catch(() => {
      if (this.contentByService.get(serviceKey) === loading) {
        this.contentByService.delete(serviceKey);
      }
    });
    return loading;
  }

  private enqueue(task: () => Promise<TModule>): Promise<TModule> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async evaluateAndResolve(request: string, serviceKey: string): Promise<TModule> {
    const task = () => this.evaluateAndResolveInsideGuard(request, serviceKey);

    return this.options.globalGuard == null ? task() : this.options.globalGuard.run(serviceKey, task);
  }

  private async evaluateAndResolveInsideGuard(request: string, serviceKey: string): Promise<TModule> {
    const runtime = globalThis.__MICRO_FRONTEND__;
    const instances = runtime.__INSTANCES__;
    const startIndex = instances.length;
    try {
      await this.options.evaluate(request);
    } catch (cause) {
      return this.resolveFallback(request, serviceKey, cause);
    }

    const normalizedExposeName = normalizePath(this.options.exposeName);
    for (let index = instances.length - 1; index >= startIndex; index -= 1) {
      const container = instances[index];
      if (container == null) {
        continue;
      }

      const parsedModule = this.options.parseExposedModule(container.exposeMap[normalizedExposeName]);
      if (parsedModule != null) {
        return parsedModule;
      }
    }

    return this.resolveFallback(request, serviceKey, new ServiceModuleNotFoundError(serviceKey, normalizedExposeName));
  }

  private async resolveFallback(request: string, serviceKey: string, cause: unknown): Promise<TModule> {
    const fallback = this.options.fallback;
    if (fallback == null) {
      throw cause;
    }

    const fallbackModule = await fallback({ request, serviceKey, cause });
    if (fallbackModule == null) {
      throw cause;
    }
    return fallbackModule;
  }
}

export function createServiceBundleLoader<TModule>(
  options: ServiceBundleLoaderOptions<TModule>
): ServiceBundleLoader<TModule> {
  return new DefaultServiceBundleLoader(options);
}
