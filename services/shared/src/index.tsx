import { ErrorBoundary } from '@toss/error-boundary';
import * as React from 'react';
import * as ReactNative from 'react-native';
import * as ReactNativeSafeAreaContext from 'react-native-safe-area-context';
import { __granite_require__ } from './granite-require/__granite_require__';
import { ErrorPage } from './pages/ErrorPage';
import type { InitialProps } from './types';
import { getGlobal } from './utils/getGlobal';
import { loadAppContent } from './utils/loadAppContent';

export function initialize() {
  injectGlobals();

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

function injectGlobals() {
  const global = getGlobal();
  global.__SPLIT_CHUNK_ENABLED__ = true;
  global.__granite_require__ = __granite_require__;
}
