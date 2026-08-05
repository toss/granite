import type { InitialProps } from '@granite-js/react-native';
import { ErrorBoundary } from '@toss/error-boundary';
import React, { Suspense } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MonoHermesMainPageTrack } from './MonoHermesMainPageTrack';
import { ErrorPage } from '../components/ErrorPage';
import { loadAppContent } from '../utils/loadAppContent';

const AppContent = React.lazy(() => loadAppContent('showcase/App'));

export type SharedInitialProps = InitialProps & {
  readonly _monoHermes?: boolean;
};

export function MainPage(props: SharedInitialProps) {
  return (
    <ErrorBoundary renderFallback={(props) => <ErrorPage reason={props.error.message} />}>
      {props._monoHermes === true ? (
        <MonoHermesMainPageTrack initialProps={props} />
      ) : (
        <SafeAreaProvider>
          <Suspense fallback={null}>
            <AppContent {...props} />
          </Suspense>
        </SafeAreaProvider>
      )}
    </ErrorBoundary>
  );
}
