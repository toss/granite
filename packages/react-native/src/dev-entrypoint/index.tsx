import type { ComponentType } from 'react';
import { AppRegistry } from 'react-native';
import { ENTRY_BUNDLE_NAME } from '../constants';

export function register(Component: ComponentType<any>) {
  if (AppRegistry.getAppKeys().includes(ENTRY_BUNDLE_NAME)) {
    console.warn('Granite entrypoint is already registered');
    return;
  }

  const component = (props: any) => <Component {...props} />;

  AppRegistry.registerComponent(ENTRY_BUNDLE_NAME, () => component);
}
