import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContainer, createServiceBundleLoader, exposeModule, isMonoHermes } from './index';

type Service = () => string;

function isServiceModule(value: unknown): value is { readonly default: Service } {
  return typeof value === 'object' && value !== null && 'default' in value && typeof value.default === 'function';
}

function parseServiceModule(value: unknown): Service | null {
  return isServiceModule(value) ? value.default : null;
}

function serviceKeyOf(request: string): string | null {
  return /^service:\/\/([^/?#]+)/.exec(request)?.[1]?.toLowerCase() ?? null;
}

function createDeferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolvePromise = () => {};
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

describe('createServiceBundleLoader', () => {
  beforeEach(() => {
    Reflect.set(globalThis, '__MICRO_FRONTEND__', { __INSTANCES__: [], __SHARED__: {} });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  });

  it('marks the runtime as mono Hermes before evaluating a service bundle', async () => {
    // Given
    const evaluate = vi.fn(async () => {
      expect(isMonoHermes()).toBe(true);
      const container = createContainer('remote-alpha', {});
      exposeModule(container, 'Service', { default: () => 'alpha' });
    });
    const loader = createServiceBundleLoader<Service>({
      evaluate,
      exposeName: 'Service',
      getServiceKey: serviceKeyOf,
      parseExposedModule: parseServiceModule,
    });

    // When
    expect(isMonoHermes()).toBe(false);
    await loader.load('service://alpha');

    // Then
    expect(isMonoHermes()).toBe(true);
  });

  it('resolves distinct services from containers appended by serialized evaluations', async () => {
    // Given
    const alphaEvaluationStarted = createDeferred();
    const releaseAlphaEvaluation = createDeferred();
    const evaluationOrder: string[] = [];
    const evaluate = vi.fn(async (request: string) => {
      const serviceKey = serviceKeyOf(request);
      if (serviceKey == null) {
        throw new Error(`Unexpected request: ${request}`);
      }
      evaluationOrder.push(`start:${serviceKey}`);
      if (serviceKey === 'alpha') {
        alphaEvaluationStarted.resolve();
        await releaseAlphaEvaluation.promise;
      }
      const container = createContainer(`remote-${serviceKey}`, {});
      exposeModule(container, 'Service', { default: () => serviceKey });
      evaluationOrder.push(`end:${serviceKey}`);
    });
    const loader = createServiceBundleLoader<Service>({
      evaluate,
      exposeName: 'Service',
      getServiceKey: serviceKeyOf,
      parseExposedModule: parseServiceModule,
    });

    // When
    const alpha = loader.load('service://alpha');
    const beta = loader.load('service://beta');
    await alphaEvaluationStarted.promise;

    // Then
    expect(evaluationOrder).toEqual(['start:alpha']);
    releaseAlphaEvaluation.resolve();
    await expect(Promise.all([alpha, beta])).resolves.toEqual([expect.any(Function), expect.any(Function)]);
    expect((await alpha)()).toBe('alpha');
    expect((await beta)()).toBe('beta');
    expect(evaluationOrder).toEqual(['start:alpha', 'end:alpha', 'start:beta', 'end:beta']);
  });

  it('shares one in-flight evaluation for requests with the same caller-derived service key', async () => {
    // Given
    const evaluate = vi.fn(async () => {
      const container = createContainer('remote-alpha', {});
      exposeModule(container, 'Service', { default: () => 'alpha' });
    });
    const loader = createServiceBundleLoader<Service>({
      evaluate,
      exposeName: 'Service',
      getServiceKey: serviceKeyOf,
      parseExposedModule: parseServiceModule,
    });

    // When
    const [first, second] = await Promise.all([
      loader.load('service://alpha'),
      loader.load('service://ALPHA?variant=one'),
    ]);

    // Then
    expect(first).toBe(second);
    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it('evicts a rejected evaluation so the next load can retry', async () => {
    // Given
    const retryService: Service = () => 'retry';
    const evaluate = vi
      .fn<(request: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockImplementationOnce(async () => {
        const container = createContainer('remote-retry', {});
        exposeModule(container, 'Service', { default: retryService });
      });
    const loader = createServiceBundleLoader<Service>({
      evaluate,
      exposeName: 'Service',
      getServiceKey: serviceKeyOf,
      parseExposedModule: parseServiceModule,
    });

    // When
    await expect(loader.load('service://retry')).rejects.toThrow('temporary failure');
    const retried = await loader.load('service://retry');

    // Then
    expect(retried).toBe(retryService);
    expect(evaluate).toHaveBeenCalledTimes(2);
  });

  it('uses a caller-supplied fallback without hard-coding a legacy runtime', async () => {
    // Given
    const legacyService: Service = () => 'legacy';
    const loader = createServiceBundleLoader<Service>({
      evaluate: async () => {
        throw new Error('evaluation is unavailable');
      },
      exposeName: 'Service',
      fallback: async ({ cause }) => (cause instanceof Error ? legacyService : null),
      getServiceKey: serviceKeyOf,
      parseExposedModule: parseServiceModule,
    });

    // When
    const service = await loader.load('service://legacy');

    // Then
    expect(service).toBe(legacyService);
    expect(isMonoHermes()).toBe(false);
  });

  it('keeps legacy runtime mode when an evaluated bundle does not expose the requested module', async () => {
    // Given
    const legacyService: Service = () => 'legacy';
    const loader = createServiceBundleLoader<Service>({
      evaluate: async () => {
        createContainer('remote-without-service', {});
      },
      exposeName: 'Service',
      fallback: async () => legacyService,
      getServiceKey: serviceKeyOf,
      parseExposedModule: parseServiceModule,
    });

    // When
    const service = await loader.load('service://legacy');

    // Then
    expect(service).toBe(legacyService);
    expect(isMonoHermes()).toBe(false);
  });

  it('does not hide an exposed-module parser defect behind fallback', async () => {
    // Given
    const fallback = vi.fn(async () => () => 'legacy');
    const loader = createServiceBundleLoader<Service>({
      evaluate: async () => {
        const container = createContainer('remote-invalid', {});
        exposeModule(container, 'Service', { default: () => 'invalid' });
      },
      exposeName: 'Service',
      fallback,
      getServiceKey: serviceKeyOf,
      parseExposedModule: () => {
        throw new Error('service module parser failed');
      },
    });

    // When
    const loading = loader.load('service://invalid');

    // Then
    await expect(loading).rejects.toThrow('service module parser failed');
    expect(fallback).not.toHaveBeenCalled();
  });
});
