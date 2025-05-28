'use strict';

import type { ComponentType } from 'react';
import { AppRegistry } from 'react-native';
import { setup } from '../rn-polyfills';

setup();

let registered = false;

export function register(Component: ComponentType<any>) {
  if (registered) {
    throw new Error('둘 이상의 Page를 register할 수 없습니다. entrypoint에서 1회에 한해 호출해주세요.');
  }
  registered = true;

  const component = (props: any) => <Component {...props} />;

  AppRegistry.registerComponent('Page', () => component);
  AppRegistry.registerComponent('shared', () => component);
}
