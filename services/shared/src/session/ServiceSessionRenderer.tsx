import type { InitialProps } from '@granite-js/react-native';
import { Component, type PropsWithChildren, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SERVICE_SESSION_NATIVE_ID_PREFIX, type ServiceSession } from './serviceSession';
import type { ServiceComponent, ServiceSessionRuntime } from './serviceSessionRuntime';
import { ErrorPage } from '../components/ErrorPage';

type ServiceLoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly ServiceContent: ServiceComponent }
  | { readonly kind: 'failed'; readonly reason: string };

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

export interface ServiceSessionRendererProps {
  readonly initialProps: InitialProps;
  readonly runtime: ServiceSessionRuntime;
  readonly session: ServiceSession;
}

export function ServiceSessionRenderer({ initialProps, runtime, session }: ServiceSessionRendererProps) {
  const [loadState, setLoadState] = useState<ServiceLoadState>({
    kind: 'loading',
  });

  useEffect(() => {
    let active = true;

    async function loadService() {
      try {
        const ServiceContent = await runtime.load(session.bundleRequest);
        if (active) {
          setLoadState({ kind: 'ready', ServiceContent });
        }
      } catch (cause) {
        if (active) {
          setLoadState({
            kind: 'failed',
            reason: cause instanceof Error ? cause.message : 'Unknown load error',
          });
        }
      }
    }

    void loadService();
    return () => {
      active = false;
    };
  }, [runtime, session.bundleRequest]);

  const content = (() => {
    switch (loadState.kind) {
      case 'loading':
        return null;
      case 'failed':
        return <ErrorPage reason={loadState.reason} />;
      case 'ready': {
        const { ServiceContent } = loadState;
        return (
          <ServiceRenderBoundary>
            <ServiceContent initialProps={initialProps} session={session} />
          </ServiceRenderBoundary>
        );
      }
      default: {
        const exhaustiveState: never = loadState;
        return exhaustiveState;
      }
    }
  })();

  return (
    <View
      collapsable={false}
      nativeID={`${SERVICE_SESSION_NATIVE_ID_PREFIX}${session.identifier}`}
      style={StyleSheet.absoluteFill}
    >
      {content}
    </View>
  );
}
