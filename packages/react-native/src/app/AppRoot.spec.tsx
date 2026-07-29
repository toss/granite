import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from '@granite-js/native/react-native-safe-area-context';
import { describe, expect, it } from 'vitest';
import { AppSafeAreaProvider } from './AppSafeAreaProvider';

describe('AppSafeAreaProvider', () => {
  it('isolates a service root from the host safe-area contexts', () => {
    const child = <span>service</span>;
    const insetsReset = AppSafeAreaProvider({ children: child, isolateFromParent: true });
    const frameReset = insetsReset.props.children;
    const provider = frameReset.props.children;

    expect(insetsReset.type).toBe(SafeAreaInsetsContext.Provider);
    expect(insetsReset.props.value).toBeNull();
    expect(frameReset.type).toBe(SafeAreaFrameContext.Provider);
    expect(frameReset.props.value).toBeNull();
    expect(provider.type).toBe(SafeAreaProvider);
    expect(provider.props.initialMetrics).toBeUndefined();
    expect(provider.props.children).toBe(child);
  });

  it('keeps the existing safe-area provider for a normal app root', () => {
    const provider = AppSafeAreaProvider({ children: null, isolateFromParent: false });

    expect(provider.type).toBe(SafeAreaProvider);
  });
});
