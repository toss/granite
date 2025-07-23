import { Granite, type InitialProps } from '@granite-js/react-native';
import { MainPage } from './pages/MainPage';
import { requireContextShim } from './shims';

function AppContainer(props: InitialProps) {
  return <MainPage {...props} />;
}

export default Granite.registerApp(AppContainer, {
  appName: 'shared',
  context: requireContextShim(),
  UNSTABLE__disableRouter: true,
});
