import { createContext, type Context, type PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import { BackHandler } from 'react-native';
import type { BackEvent } from '../use-back-event';

export const SERVICE_SESSION_CONTEXT_GLOBAL_KEY = '__GRANITE_SERVICE_SESSION_CONTEXT__';

export interface ServiceSessionContextValue {
  readonly identifier: string;
  readonly isVisible: boolean;
  readonly close: () => Promise<void>;
}

type ServiceSessionReactContext = Context<ServiceSessionContextValue | null>;

function getOrCreateServiceSessionContext(): ServiceSessionReactContext {
  const existingContext = Reflect.get(globalThis, SERVICE_SESSION_CONTEXT_GLOBAL_KEY) as
    | ServiceSessionReactContext
    | undefined;
  if (existingContext != null) {
    return existingContext;
  }

  const context = createContext<ServiceSessionContextValue | null>(null);
  Reflect.set(globalThis, SERVICE_SESSION_CONTEXT_GLOBAL_KEY, context);
  return context;
}

const ServiceSessionContext = getOrCreateServiceSessionContext();

export function ServiceSessionProvider({
  children,
  identifier,
  isVisible,
  close,
}: PropsWithChildren<ServiceSessionContextValue>) {
  const value = useMemo(
    () => ({
      identifier,
      isVisible,
      close,
    }),
    [close, identifier, isVisible]
  );

  return <ServiceSessionContext.Provider value={value}>{children}</ServiceSessionContext.Provider>;
}

export function useServiceSession(): ServiceSessionContextValue | null {
  return useContext(ServiceSessionContext);
}

export function ServiceSessionBackGuard({ onBack }: { readonly onBack: (event: BackEvent) => void }) {
  const session = useServiceSession();

  useEffect(() => {
    if (session?.isVisible !== true) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack({ source: 'androidHardwareBackPress' });
      return true;
    });

    return () => subscription.remove();
  }, [onBack, session?.isVisible]);

  return null;
}
