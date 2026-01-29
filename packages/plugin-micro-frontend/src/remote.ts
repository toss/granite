import { log } from './log';
import type { RemoteConfig } from './types';

const FALLBACK_SCRIPT = `console.warn('[MICRO FRONTEND] Failed to fetch remote bundles. Please check if the remote dev server is running')`;

export async function fetchRemoteBundle(remote: RemoteConfig) {
  globalThis.remoteBundles = {
    android: FALLBACK_SCRIPT,
    ios: FALLBACK_SCRIPT,
  };

  try {
    log('Prefetching remote bundles for development environment...');
    const [androidBundle, iosBundle] = await Promise.all([fetchBundle(remote, 'android'), fetchBundle(remote, 'ios')]);

    globalThis.remoteBundles = {
      android: androidBundle,
      ios: iosBundle,
    };
    log('Fetch complete');
  } catch {
    log('Failed to fetch remote bundles. Please check if the remote dev server is running');
  }
}

async function fetchBundle(remote: RemoteConfig, platform: 'android' | 'ios') {
  const response = await fetch(`http://${remote.host}:${remote.port}/index.bundle?dev=true&platform=${platform}`);
  const bundle = await response.text();
  return bundle;
}

declare global {
  var remoteBundles: Record<'android' | 'ios', string> | null;
}
