import { closeView, getSchemeUri } from '@granite-js/react-native';
import { Granite, type InitialProps } from '@granite-js/react-native/core';
import { Router } from '@granite-js/react-native/router';
import { context } from '../require.context';

function App({ scheme }: InitialProps) {
  return (
    <Router
      context={context}
      prefix="granite://counter"
      initialUrl={scheme}
      getInitialUrl={(url) => url ?? getSchemeUri()}
      onRootBack={closeView}
    />
  );
}

export default Granite.registerApp(App, { appName: 'counter' });
