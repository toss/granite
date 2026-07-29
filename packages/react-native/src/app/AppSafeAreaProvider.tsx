import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from '@granite-js/native/react-native-safe-area-context';
import type { PropsWithChildren } from 'react';

export function AppSafeAreaProvider({
  children,
  isolateFromParent,
}: PropsWithChildren<{ readonly isolateFromParent: boolean }>) {
  const provider = <SafeAreaProvider>{children}</SafeAreaProvider>;

  if (!isolateFromParent) {
    return provider;
  }

  return (
    <SafeAreaInsetsContext.Provider value={null}>
      <SafeAreaFrameContext.Provider value={null}>{provider}</SafeAreaFrameContext.Provider>
    </SafeAreaInsetsContext.Provider>
  );
}
