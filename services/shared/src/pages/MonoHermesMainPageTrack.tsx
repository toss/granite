import { MicroFrontendSessionProvider, type MicroFrontendRuntimeEvent } from '@granite-js/micro-frontend';
import { Portal, PortalProvider } from '@granite-js/portal';
import type { InitialProps } from '@granite-js/react-native';
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { ErrorPage } from '../components/ErrorPage';
import { microFrontendRuntime } from '../micro-frontend/runtime';
import {
  type AppModule,
  MICRO_FRONTEND_SESSION_NATIVE_ID_PREFIX,
  type MicroFrontendSession,
  reduceMicroFrontendSessions,
} from '../micro-frontend/session';

function reportMicroFrontendError(error: unknown): void {
  console.error('[micro-frontend] Failed to preload app', error);
}

interface SessionErrorBoundaryState {
  readonly error: Error | null;
}

class SessionErrorBoundary extends Component<PropsWithChildren, SessionErrorBoundaryState> {
  state: SessionErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SessionErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error != null) {
      return <ErrorPage reason={this.state.error.message} />;
    }
    return this.props.children;
  }
}

function SessionRoot({
  initialProps,
  session,
}: {
  readonly initialProps: InitialProps;
  readonly session: MicroFrontendSession;
}) {
  const close = useCallback(() => microFrontendRuntime.closeSession(session.sessionId), [session.sessionId]);
  const { App } = session;

  return (
    <Portal hostName={session.sessionId}>
      <View
        collapsable={false}
        nativeID={`${MICRO_FRONTEND_SESSION_NATIVE_ID_PREFIX}${session.sessionId}`}
        style={StyleSheet.absoluteFill}
      >
        <MicroFrontendSessionProvider sessionId={session.sessionId} isVisible={session.isVisible} close={close}>
          <SessionErrorBoundary>
            <Suspense fallback={null}>
              <App {...initialProps} scheme={session.scheme} />
            </Suspense>
          </SessionErrorBoundary>
        </MicroFrontendSessionProvider>
      </View>
    </Portal>
  );
}

export function MonoHermesMainPageTrack({ initialProps }: { readonly initialProps: InitialProps }) {
  const [sessions, dispatch] = useReducer(reduceMicroFrontendSessions, []);

  useEffect(() => {
    const subscription = microFrontendRuntime.onEvent((event: MicroFrontendRuntimeEvent) => {
      switch (event.name) {
        case 'preloadApp':
          void microFrontendRuntime.preloadApp(event.params.appName).catch(reportMicroFrontendError);
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
