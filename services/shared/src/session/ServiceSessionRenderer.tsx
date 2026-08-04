import { serviceSessions, ServiceSessionProvider } from '@granite-js/react-native';
import { Component, type PropsWithChildren, Suspense, useCallback } from 'react';
import type { ServiceSession } from './serviceSession';
import { ErrorPage } from '../components/ErrorPage';

interface ServiceRenderBoundaryState {
  readonly error: Error | null;
}

class ServiceRenderBoundary extends Component<PropsWithChildren, ServiceRenderBoundaryState> {
  state: ServiceRenderBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ServiceRenderBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error != null) {
      return <ErrorPage reason={this.state.error.message} />;
    }
    return this.props.children;
  }
}

export interface ServiceSessionRendererProps extends PropsWithChildren {
  readonly session: ServiceSession;
}

export function ServiceSessionRenderer({ children, session }: ServiceSessionRendererProps) {
  const close = useCallback(() => serviceSessions.close(session.identifier), [session.identifier]);

  return (
    <ServiceSessionProvider identifier={session.identifier} isVisible={session.isVisible} close={close}>
      <ServiceRenderBoundary>
        <Suspense fallback={null}>{children}</Suspense>
      </ServiceRenderBoundary>
    </ServiceSessionProvider>
  );
}
