import type { InitialProps } from '@granite-js/react-native';
import { MonoHermesTrack } from '../micro-frontend/MonoHermesTrack';

export function MainPage(props: InitialProps) {
  return <MonoHermesTrack initialProps={props} />;
}
