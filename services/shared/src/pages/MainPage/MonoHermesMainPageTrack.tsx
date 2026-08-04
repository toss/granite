import { Portal, PortalProvider } from '@granite-js/portal';
import { serviceSessions, type InitialProps } from '@granite-js/react-native';
import { lazy, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ServiceSessionRenderer } from '../../session/ServiceSessionRenderer';
import {
  closeServiceSession,
  createServiceSessionInitialProps,
  openServiceSession,
  SERVICE_SESSION_NATIVE_ID_PREFIX,
  type ServiceSession,
  updateServiceSessionVisibility,
} from '../../session/serviceSession';

const INITIAL_SESSIONS: readonly ServiceSession[] = [];

export function MonoHermesMainPageTrack({ initialProps }: { readonly initialProps: InitialProps }) {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);

  useEffect(() => {
    const openSubscription = serviceSessions.addEventListener('openService', (event) => {
      const ServiceComponent = lazy(() => serviceSessions.importService(event.serviceName));
      setSessions((currentSessions) => openServiceSession(currentSessions, event, ServiceComponent));
    });
    const closeSubscription = serviceSessions.addEventListener('closeService', (event) => {
      setSessions((currentSessions) => closeServiceSession(currentSessions, event));
    });
    const visibilitySubscription = serviceSessions.addEventListener('sessionVisibilityChanged', (event) => {
      setSessions((currentSessions) => updateServiceSessionVisibility(currentSessions, event));
    });

    return () => {
      openSubscription.remove();
      closeSubscription.remove();
      visibilitySubscription.remove();
    };
  }, []);

  return (
    <PortalProvider>
      <View style={styles.container}>
        {sessions.map((session) => {
          const { ServiceComponent } = session;
          const serviceInitialProps = createServiceSessionInitialProps(initialProps, session.url);

          return (
            <Portal key={session.identifier} hostName={session.identifier}>
              <View
                collapsable={false}
                nativeID={`${SERVICE_SESSION_NATIVE_ID_PREFIX}${session.identifier}`}
                style={StyleSheet.absoluteFill}
              >
                <ServiceSessionRenderer session={session}>
                  <ServiceComponent {...serviceInitialProps} />
                </ServiceSessionRenderer>
              </View>
            </Portal>
          );
        })}
      </View>
    </PortalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
