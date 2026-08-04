import type { InitialProps } from '@granite-js/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ErrorPage } from '../components/ErrorPage';
import { LegacyMainPageTrack } from './MainPage/LegacyMainPageTrack';
import { MonoHermesMainPageTrack } from './MainPage/MonoHermesMainPageTrack';
import { resolveMainPageTrack } from './mainPageTrack';

export type SharedInitialProps = InitialProps & {
  readonly _monoHermes?: boolean;
};

export function MainPage(props: SharedInitialProps) {
  const track = resolveMainPageTrack(props);

  return (
    <ErrorBoundary renderFallback={(error) => <ErrorPage reason={error.message} />}>
      {track === 'serviceSession' ? (
        <MonoHermesMainPageTrack initialProps={props} />
      ) : (
        <SafeAreaProvider>
          <LegacyMainPageTrack {...props} />
        </SafeAreaProvider>
      )}
    </ErrorBoundary>
  );
}
