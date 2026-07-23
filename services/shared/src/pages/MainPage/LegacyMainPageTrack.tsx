import type { InitialProps } from '@granite-js/react-native';
import React, { Suspense } from 'react';
import { loadAppContent } from '../../utils/loadAppContent';

const AppContent = React.lazy(() => loadAppContent('remoteApp/AppContainer'));

export function LegacyMainPageTrack(props: InitialProps) {
  return (
    <Suspense fallback={null}>
      <AppContent {...props} />
    </Suspense>
  );
}
