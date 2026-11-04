import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useIsFocusedSafely } from './react-navigation/useIsFocusedSafely';

const RouterActivityContext = createContext(true);

export function RouterActivityProvider({ children, isActive }: PropsWithChildren<{ isActive?: boolean }>) {
  const parentActive = useContext(RouterActivityContext);
  const [foreground, setForeground] = useState(AppState.currentState == null || AppState.currentState === 'active');
  useEffect(() => {
    if (isActive !== undefined) {
      return;
    }
    setForeground(AppState.currentState == null || AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription.remove();
  }, [isActive]);
  return (
    <RouterActivityContext.Provider value={parentActive && (isActive ?? foreground)}>
      {children}
    </RouterActivityContext.Provider>
  );
}

export function useVisibility() {
  const active = useContext(RouterActivityContext);
  const focused = useIsFocusedSafely();
  return active && focused;
}
