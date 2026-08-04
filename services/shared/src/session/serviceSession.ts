import type { InitialProps, ServiceComponent, ServiceSessionEventMap } from '@granite-js/react-native';
import type { LazyExoticComponent } from 'react';

export const SERVICE_SESSION_NATIVE_ID_PREFIX = 'micro-frontend-session:';

export type ServiceSession = {
  readonly identifier: string;
  readonly serviceName: string;
  readonly url: string;
  readonly isVisible: boolean;
  readonly ServiceComponent: LazyExoticComponent<ServiceComponent>;
};

export function createServiceSessionInitialProps(initialProps: InitialProps, serviceUrl: string): InitialProps {
  return {
    ...initialProps,
    scheme: serviceUrl,
  };
}

export function openServiceSession(
  sessions: readonly ServiceSession[],
  event: ServiceSessionEventMap['openService'],
  ServiceComponent: LazyExoticComponent<ServiceComponent>
): readonly ServiceSession[] {
  return sessions.some((session) => session.identifier === event.identifier)
    ? sessions
    : [...sessions, { ...event, isVisible: false, ServiceComponent }];
}

export function closeServiceSession(
  sessions: readonly ServiceSession[],
  event: ServiceSessionEventMap['closeService']
): readonly ServiceSession[] {
  return sessions.filter((session) => session.identifier !== event.identifier);
}

export function updateServiceSessionVisibility(
  sessions: readonly ServiceSession[],
  event: ServiceSessionEventMap['sessionVisibilityChanged']
): readonly ServiceSession[] {
  return sessions.map((session) =>
    session.identifier === event.identifier ? { ...session, isVisible: event.isVisible } : session
  );
}
