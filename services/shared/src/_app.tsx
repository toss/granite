import { Granite, type InitialProps } from '@granite-js/react-native';
import { MainPage } from './pages/MainPage';
import { setupServiceSessionSharedRuntime } from './session/setupSharedRuntime';

setupServiceSessionSharedRuntime();

function AppContainer(props: InitialProps) {
  return <MainPage {...props} />;
}

export default Granite.registerHostApp(AppContainer, { appName: 'shared' });
