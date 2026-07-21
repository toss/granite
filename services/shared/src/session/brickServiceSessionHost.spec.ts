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
    brickModuleMock.get.mockImplementation((moduleName: string) => {
      if (moduleName === 'HostEventModule') {
        return {
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
      if (moduleName === 'ServiceBundleLoader') {
        return { importService };
      }
      throw new Error(`Unexpected module: ${moduleName}`);
    });

    const host = createBrickServiceSessionHost({
      bundleLoaderModuleName: 'ServiceBundleLoader',
      eventModuleName: 'HostEventModule',
    });
    expect(host).not.toBeNull();
    if (host == null) {
      return;
    }

    const received = vi.fn();
    const unsubscribe = host.subscribe(received);
    await host.evaluate('service://catalog/products/42');
    nativeListener.current?.({
      eventName: 'openService',
      body: {
        identifier: 'session-1',
        bundleRequest: 'service://catalog/products/42',
        url: 'service://catalog/products/42',
      },
    });

    expect(importService).toHaveBeenCalledWith('service://catalog/products/42');
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
      onSendEvent: () => ({ remove: () => {} }),
    });

    const host = createBrickServiceSessionHost({
      bundleLoaderModuleName: '',
      eventModuleName: 'HostEventModule',
    });

    await expect(host?.evaluate('service://catalog')).rejects.toThrow(
      'The platform did not install a service bundle loader.'
    );
    expect(fakeLoadRemote).not.toHaveBeenCalled();
    Reflect.deleteProperty(globalThis, '__mpackInternal');
  });

  it('returns null when the event Brick module name is missing', () => {
    expect(
      createBrickServiceSessionHost({
        bundleLoaderModuleName: 'ServiceBundleLoader',
        eventModuleName: '',
      })
    ).toBeNull();
    expect(brickModuleMock.get).not.toHaveBeenCalled();
  });
});
