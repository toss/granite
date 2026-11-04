import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativeModule = vi.hoisted(() => ({
  onEvent: vi.fn(() => ({ remove: vi.fn() })),
  reportContentSize: vi.fn(),
  startEventDelivery: vi.fn(),
}));

const get = vi.hoisted(() => vi.fn<(name: string) => typeof nativeModule | null>(() => nativeModule));

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get },
}));

describe('getNativeGraniteRNComponentSessions', () => {
  beforeEach(() => {
    vi.resetModules();
    get.mockClear();
  });

  it('does not look the native module up while the package is evaluated', async () => {
    // Given
    expect(get).not.toHaveBeenCalled();

    // When
    await import('./NativeGraniteRNComponentSessions');

    // Then
    expect(get).not.toHaveBeenCalled();
  });

  it('looks the native module up once, when it is first used', async () => {
    // Given
    const { getNativeGraniteRNComponentSessions } = await import('./NativeGraniteRNComponentSessions');

    // When
    const first = getNativeGraniteRNComponentSessions();
    const second = getNativeGraniteRNComponentSessions();

    // Then
    expect(first).toBe(nativeModule);
    expect(second).toBe(nativeModule);
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith('GraniteRNComponentSessions');
  });

  it('returns null when the app does not include the native module', async () => {
    // Given
    get.mockReturnValueOnce(null);
    const { getNativeGraniteRNComponentSessions } = await import('./NativeGraniteRNComponentSessions');

    // When
    const first = getNativeGraniteRNComponentSessions();
    const second = getNativeGraniteRNComponentSessions();

    // Then
    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(get).toHaveBeenCalledOnce();
  });
});
