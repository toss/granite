import { log } from './log';
import type { RemoteConfig } from './types';

export async function fetchRemoteBundle(remote: RemoteConfig) {
  log('Fetching remote bundles...');
  const [androidBundle, iosBundle] = await Promise.all([fetchBundle(remote, 'android'), fetchBundle(remote, 'ios')]);

  globalThis.remoteBundles = {
    android: androidBundle,
    ios: iosBundle,
  };

  log('Fetch complete');
}

async function fetchBundle(remote: RemoteConfig, platform: 'android' | 'ios') {
  const response = await fetch(`http://${remote.host}:${remote.port}/index.bundle?dev=true&platform=${platform}`);
  const bundle = await response.text();
  return bundle;
}

declare global {
  // eslint-disable-next-line no-var
  var remoteBundles: Record<'android' | 'ios', string> | null;
}
