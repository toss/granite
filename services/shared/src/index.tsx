import { ErrorBoundary } from '@toss/error-boundary';
import * as React from 'react';
import * as ReactNative from 'react-native';
import * as ReactNativeSafeAreaContext from 'react-native-safe-area-context';
import { ErrorPage } from './pages/ErrorPage';
import type { InitialProps } from './types';
import { loadAppContent } from './utils/loadAppContent';

export function initialize() {
  const AppContent = React.lazy(() => loadAppContent());
  const App = function SuspendedApp(props: InitialProps) {
    return (
      <ErrorBoundary renderFallback={ErrorPage}>
        <ReactNativeSafeAreaContext.SafeAreaProvider>
          <React.Suspense fallback={null}>
            <AppContent {...props} />
          </React.Suspense>
        </ReactNativeSafeAreaContext.SafeAreaProvider>
      </ErrorBoundary>
    );
  };

  ReactNative.AppRegistry.registerComponent('shared', () => App);
}
