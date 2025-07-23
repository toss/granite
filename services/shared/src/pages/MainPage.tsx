import { ErrorBoundary } from '@toss/error-boundary';
import React, { Suspense } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorPage } from '../components/ErrorPage';
import type { InitialProps } from '../types';
import { loadAppContent } from '../utils/loadAppContent';

const AppContent = React.lazy(() => loadAppContent('remoteApp/AppContainer'));

export function MainPage(props: InitialProps) {
  return (
    <ErrorBoundary renderFallback={(props) => <ErrorPage reason={props.error.message} />}>
      <SafeAreaProvider>
        <Suspense fallback={null}>
          <AppContent {...props} />
        </Suspense>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
