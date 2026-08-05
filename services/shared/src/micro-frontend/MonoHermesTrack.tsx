import { Portal, PortalProvider } from '@granite-js/portal';
import type { InitialProps } from '@granite-js/react-native';
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { MicroFrontendSessionProvider, type MicroFrontendRuntimeEvent } from '@granite-js/micro-frontend';
import { ErrorPage } from '../components/ErrorPage';
import { microFrontendRuntime } from './runtime';
import { reduceSessions, type Session } from './sessionReducer';

interface AppModule {
  readonly default: ComponentType<InitialProps>;
}

interface SessionRootProps {
  readonly initialProps: InitialProps;
  readonly session: Session;
}

interface ErrorBoundaryProps extends PropsWithChildren {
  readonly renderFallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    return this.state.error == null ? this.props.children : this.props.renderFallback(this.state.error);
  }
}

const INITIAL_SESSIONS: readonly Session[] = [];

function SessionRoot({ initialProps, session }: SessionRootProps) {
  const close = useCallback(() => microFrontendRuntime.closeSession(session.sessionId), [session.sessionId]);
  const { App } = session;

  return (
    <Portal hostName={session.sessionId}>
      <View
        collapsable={false}
        nativeID={`micro-frontend-session:${session.sessionId}`}
        style={StyleSheet.absoluteFill}
      >
        <MicroFrontendSessionProvider sessionId={session.sessionId} isVisible={session.isVisible} close={close}>
          <ErrorBoundary renderFallback={(error) => <ErrorPage reason={error.message} />}>
            <Suspense fallback={null}>
              <App {...initialProps} scheme={session.scheme} />
            </Suspense>
          </ErrorBoundary>
        </MicroFrontendSessionProvider>
      </View>
    </Portal>
  );
}

export function MonoHermesTrack({ initialProps }: { readonly initialProps: InitialProps }) {
  const [sessions, dispatch] = useReducer(reduceSessions, INITIAL_SESSIONS);

  useEffect(() => {
    const subscription = microFrontendRuntime.onEvent((event: MicroFrontendRuntimeEvent) => {
      switch (event.name) {
        case 'preloadApp':
          void microFrontendRuntime.preloadApp(event.params.appName).catch((error: unknown) => {
            if (error instanceof Error) {
              console.error('Failed to preload a micro frontend', error);
              return;
            }
            throw error;
          });
          return;
        case 'openApp': {
          const { appName, scheme, sessionId } = event.params;
          dispatch({
            type: 'opened',
            session: {
              sessionId,
              scheme,
              isVisible: false,
              App: lazy(() => microFrontendRuntime.importApp<AppModule>(`${appName}/App`)),
            },
          });
          return;
        }
        case 'closeApp':
          dispatch({ type: 'closed', sessionId: event.params.sessionId });
          return;
        case 'sessionVisibilityChanged':
          dispatch({
            type: 'visibilityChanged',
            sessionId: event.params.sessionId,
            isVisible: event.params.isVisible,
          });
          return;
        default:
          event satisfies never;
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <PortalProvider>
      <View style={styles.container}>
        {sessions.map((session) => (
          <SessionRoot key={session.sessionId} initialProps={initialProps} session={session} />
        ))}
      </View>
    </PortalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
