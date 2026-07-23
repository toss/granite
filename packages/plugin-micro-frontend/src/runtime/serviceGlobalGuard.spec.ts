import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServiceGlobalGuard, type ServiceGlobalReport } from './index';

const HOST_RUNTIME_KEY = '__graniteTestHostRuntime__';
const SERVICE_GLOBAL_KEY = '__graniteTestServiceGlobal__';

describe('createServiceGlobalGuard', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, HOST_RUNTIME_KEY);
    Reflect.deleteProperty(globalThis, SERVICE_GLOBAL_KEY);
  });

  it('restores configured host globals and reports added or overwritten tracked-record keys', async () => {
    // Given
    const hostRuntime = () => 'host';
    const environment: Record<string, unknown> = { API_STAGE: 'production' };
    const onReport = vi.fn<(report: ServiceGlobalReport) => void>();
    Reflect.set(globalThis, HOST_RUNTIME_KEY, hostRuntime);
    const guard = createServiceGlobalGuard({
      onReport,
      protectedKeys: [HOST_RUNTIME_KEY],
      trackedRecords: [{ name: 'environment', read: () => environment }],
    });

    // When
    await guard.run('catalog', async () => {
      Reflect.set(globalThis, HOST_RUNTIME_KEY, () => 'service');
      Reflect.set(globalThis, SERVICE_GLOBAL_KEY, 'catalog-owned');
      environment.API_STAGE = 'development';
      environment.CATALOG_ENDPOINT = 'https://catalog.example.com';
    });

    // Then
    expect(Reflect.get(globalThis, HOST_RUNTIME_KEY)).toBe(hostRuntime);
    expect(onReport).toHaveBeenCalledWith({
      addedGlobalKeys: [SERVICE_GLOBAL_KEY],
      restoredProtectedKeys: [HOST_RUNTIME_KEY],
      serviceKey: 'catalog',
      trackedRecords: [
        {
          addedKeys: ['CATALOG_ENDPOINT'],
          name: 'environment',
          overwrittenKeys: ['API_STAGE'],
        },
      ],
    });
    expect(guard.getReport('catalog')).toEqual(onReport.mock.calls[0]?.[0]);
  });

  it('reconciles protected globals even when service evaluation rejects', async () => {
    // Given
    const hostRuntime = { owner: 'host' };
    Reflect.set(globalThis, HOST_RUNTIME_KEY, hostRuntime);
    const guard = createServiceGlobalGuard({ protectedKeys: [HOST_RUNTIME_KEY] });

    // When
    const failedEvaluation = guard.run('broken-service', async () => {
      Reflect.set(globalThis, HOST_RUNTIME_KEY, { owner: 'service' });
      throw new Error('bundle evaluation failed');
    });

    // Then
    await expect(failedEvaluation).rejects.toThrow('bundle evaluation failed');
    expect(Reflect.get(globalThis, HOST_RUNTIME_KEY)).toBe(hostRuntime);
    expect(guard.getReport('broken-service')?.restoredProtectedKeys).toEqual([HOST_RUNTIME_KEY]);
  });
});
