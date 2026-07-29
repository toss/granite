import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrickServiceSessionHost } from './brickServiceSessionHost';

const brickModuleMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('brick-module', () => ({
  BrickModule: brickModuleMock,
}));

describe('createBrickServiceSessionHost', () => {
  beforeEach(() => {
    brickModuleMock.get.mockReset();
    Reflect.deleteProperty(globalThis, '__mpackInternal');
  });

  it('evaluates through the platform bundle loader and forwards parsed session events', async () => {
    const importService = vi.fn(async () => 'catalog.bundle');
    const fakeLoadRemote = vi.fn(async () => {});
    const nativeListener: { current: ((event: unknown) => void) | null } = { current: null };

    Reflect.set(globalThis, '__mpackInternal', { loadRemote: fakeLoadRemote });
    const closeServiceActivity = vi.fn(async () => undefined);
    const startServiceSessionEvents = vi.fn(async () => undefined);
    brickModuleMock.get.mockImplementation((moduleName: string) => {
      if (moduleName === 'ServiceSessionModule') {
        return {
          importService,
          closeServiceActivity,
          startServiceSessionEvents,
          onSendEvent: (listener: (event: unknown) => void) => {
            nativeListener.current = listener;
            return {
              remove: () => {
                nativeListener.current = null;
              },
            };
          },
        };
      }
      throw new Error(`Unexpected module: ${moduleName}`);
    });

    const host = createBrickServiceSessionHost({
      bundleLoaderModuleName: 'ServiceSessionModule',
      eventModuleName: 'ServiceSessionModule',
    });
    expect(host).not.toBeNull();
    if (host == null) {
      return;
    }

    const received = vi.fn();
    const unsubscribe = host.subscribe(received);
    expect(startServiceSessionEvents).toHaveBeenCalledOnce();
    await host.importService('service://catalog/products/42');
    await host.closeServiceActivity('session-1');
    nativeListener.current?.({
      eventName: 'openService',
      body: {
        identifier: 'session-1',
        bundleRequest: 'service://catalog/products/42',
        url: 'service://catalog/products/42',
      },
    });

    expect(importService).toHaveBeenCalledWith('service://catalog/products/42');
    expect(closeServiceActivity).toHaveBeenCalledWith('session-1');
    expect(fakeLoadRemote).not.toHaveBeenCalled();
    expect(received).toHaveBeenCalledWith({
      kind: 'open',
      identifier: 'session-1',
      bundleRequest: 'service://catalog/products/42',
      url: 'service://catalog/products/42',
    });

    unsubscribe();
    expect(nativeListener.current).toBeNull();
    Reflect.deleteProperty(globalThis, '__mpackInternal');
  });

  it('does not fall back to __mpackInternal when the platform bundle loader is missing', async () => {
    const fakeLoadRemote = vi.fn(async () => {});
    Reflect.set(globalThis, '__mpackInternal', { loadRemote: fakeLoadRemote });
    brickModuleMock.get.mockReturnValue({
      startServiceSessionEvents: async () => undefined,
      onSendEvent: () => ({ remove: () => {} }),
    });

    const host = createBrickServiceSessionHost({
      bundleLoaderModuleName: '',
      eventModuleName: 'ServiceSessionModule',
    });

    await expect(host?.importService('service://catalog')).rejects.toThrow(
      'The platform did not install a service bundle loader.'
    );
    expect(fakeLoadRemote).not.toHaveBeenCalled();
    Reflect.deleteProperty(globalThis, '__mpackInternal');
  });

  it('returns null when the event Brick module name is missing', () => {
    expect(
      createBrickServiceSessionHost({
        bundleLoaderModuleName: 'ServiceSessionModule',
        eventModuleName: '',
      })
    ).toBeNull();
    expect(brickModuleMock.get).not.toHaveBeenCalled();
  });
});
