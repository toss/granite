import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativeModule = vi.hoisted(() => ({
  evaluateScript: vi.fn(async () => undefined),
  onEvent: vi.fn(() => ({ remove: vi.fn() })),
  startEventDelivery: vi.fn(),
}));

const getEnforcing = vi.hoisted(() => vi.fn(() => nativeModule));

vi.mock('react-native', () => ({
  TurboModuleRegistry: { getEnforcing },
}));

describe('NativeGraniteMicroFrontendRuntime', () => {
  beforeEach(() => {
    vi.resetModules();
    getEnforcing.mockClear();
    nativeModule.startEventDelivery.mockClear();
  });

  it('does not require the native module while the JavaScript package is evaluated', async () => {
    // Given
    expect(getEnforcing).not.toHaveBeenCalled();

    // When
    await import('./NativeGraniteMicroFrontendRuntime');

    // Then
    expect(getEnforcing).not.toHaveBeenCalled();
  });

  it('requires the native module when the runtime is first used', async () => {
    // Given
    const { default: runtime } = await import('./NativeGraniteMicroFrontendRuntime');

    // When
    runtime.startEventDelivery();

    // Then
    expect(getEnforcing).toHaveBeenCalledOnce();
    expect(getEnforcing).toHaveBeenCalledWith('GraniteMicroFrontendRuntime');
    expect(nativeModule.startEventDelivery).toHaveBeenCalledOnce();
  });
});
