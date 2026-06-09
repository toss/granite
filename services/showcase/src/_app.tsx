import { Granite, type InitialProps } from '@granite-js/react-native';
import type { PropsWithChildren } from 'react';
import * as index from './pages/index';
import * as about from './pages/about';
import * as _404 from './pages/index';

declare global {
  var __ROLLIPOP_GLOBAL__: {
    __granite: any;
  };
}

// TODO: Implement `requireContext` plugin
__ROLLIPOP_GLOBAL__.__granite = {
  app: {
    name: 'showcase',
    scheme: 'granite',
    host: '',
  },
};

var requireContext: any = function (key: string) {
  var _modules: any = {};
  _modules['./index.tsx'] = index;
  _modules['./about.tsx'] = about;
  return _modules[key];
};

requireContext.keys = function () {
  return ['./index.tsx', './about.tsx'];
};

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return <>{children}</>;
}

export default Granite.registerApp(AppContainer, { context: requireContext, appName: 'showcase' });
