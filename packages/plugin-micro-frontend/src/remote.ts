import * as fs from 'fs';
import * as path from 'path';
import { log } from './log';
import type { RemoteAppConfig, RemoteConfig } from './types';

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

  if (!response.ok) {
    throw new Error(`Remote dev server responded with ${response.status} for ${platform}`);
  }

  return await response.text();
}

async function fetchBundleWithRetry(remote: RemoteConfig, platform: 'android' | 'ios', attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchBundle(remote, platform);
    } catch (error) {
      // A cold remote dev server can 500 while its first build is in flight.
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }

  throw lastError;
}

declare global {
  var remoteBundles: Record<'android' | 'ios', string> | null;
}

const PLATFORMS = ['android', 'ios'] as const;

/**
 * Prefetches each named remote app's dev bundle into `outDir` and writes a
 * loader prelude that installs `__mpackInternal.loadRemote(appName)` with one
 * statically-required module per app/platform. Returns the loader path to be
 * injected as an esbuild prelude. Development only — the remote dev servers
 * must be running before the host dev server loads its config.
 */
export async function fetchRemoteAppBundles(remotes: RemoteAppConfig[], outDir: string): Promise<string> {
  const loaderCases: string[] = [];

  log(`Prefetching ${remotes.length} remote app bundle(s) for development environment...`);

  await Promise.all(
    remotes.flatMap((remote) =>
      PLATFORMS.map(async (platform) => {
        const fileName = `micro-frontend-remote-${sanitizeFileName(remote.name)}.${platform}.js`;
        let content: string;

        try {
          // The prelude channel loads this file as an ESM module, where
          // top-level `this` is undefined — the fetched bundle expects a
          // global-script evaluation, so re-bind `this` to the real global.
          content = `(function () {\n${await fetchBundleWithRetry(remote, platform)}\n}).call(typeof globalThis !== 'undefined' ? globalThis : global);`;
          log(`Fetched '${remote.name}' (${platform}) from ${remote.host}:${remote.port}`);
        } catch {
          content = `throw new Error(${JSON.stringify(
            `[MICRO FRONTEND] Remote app '${remote.name}' (${platform}) was not prefetched — is the dev server on ${remote.host}:${remote.port} running?`
          )});`;
          log(`Failed to fetch '${remote.name}' (${platform}) from ${remote.host}:${remote.port}`);
        }

        fs.writeFileSync(path.join(outDir, fileName), content);
        loaderCases.push(
          `    case ${JSON.stringify(`${remote.name}:${platform}`)}:\n      require('./${fileName}');\n      break;`
        );
      })
    )
  );

  const loaderPath = path.join(outDir, 'micro-frontend-remote-loader.js');
  fs.writeFileSync(loaderPath, createRemoteLoaderScript(loaderCases));

  return loaderPath;
}

function createRemoteLoaderScript(loaderCases: string[]) {
  return `var __graniteRemoteLoaderPlatform = require('react-native').Platform.OS;
var __graniteRemoteLoaderGlobal =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
      ? global
      : typeof window !== 'undefined'
        ? window
        : this;
__graniteRemoteLoaderGlobal.__mpackInternal = __graniteRemoteLoaderGlobal.__mpackInternal || {};
__graniteRemoteLoaderGlobal.__mpackInternal.loadRemote = function loadRemoteApp(appName) {
  try {
    switch (appName + ':' + __graniteRemoteLoaderPlatform) {
${loaderCases.join('\n')}
      default:
        return Promise.reject(new Error('[MICRO FRONTEND] Unknown remote app: ' + appName));
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
`;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^0-9A-Za-z_-]/g, '_');
}
