import { Granite, type InitialProps } from '@granite-js/react-native/core';
import { Router } from '@granite-js/react-native/router';
import { closeView, getSchemeUri } from '@granite-js/react-native';
import { context } from '../require.context';

function App({ scheme }: InitialProps) {
  return (
    <Router
      context={context}
      prefix="granite://%%appName%%"
      initialUrl={scheme}
      getInitialUrl={(url) => url ?? getSchemeUri()}
      onRootBack={closeView}
    />
  );
}

export default Granite.registerApp(App, { appName: '%%appName%%' });
