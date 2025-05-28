import path from 'path';

export function getReactNativeSetupScripts(rootDir: string) {
  const reactNativePath = path.dirname(
    require.resolve('react-native/package.json', {
      paths: [rootDir],
    })
  );

  return [
     
    ...require(path.join(reactNativePath, 'rn-get-polyfills'))(),
    path.join(reactNativePath, 'Libraries/Core/InitializeCore.js'),
  ] as string[];
}

export function getGlobalVariables({ dev = true }: { dev?: boolean }) {
  return {
    global: 'window',
    __DEV__: JSON.stringify(dev),
    'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production'),
  };
}

export const preludePresets = {
  globalVariables: ({ dev }: { dev: boolean }) => {
    return [
      'var __BUNDLE_START_TIME__=this.nativePerformanceNow?nativePerformanceNow():Date.now();',
      `var __DEV__=${JSON.stringify(dev)};`,
      `var window=typeof globalThis!=='undefined'?globalThis:typeof global!=='undefined'?global:typeof window!=='undefined'?window:this;`,
    ].join('\n');
  },
  graniteSharedEnvironment: ({ buildNumber }: { buildNumber: string }) => {
    return [
      'window.__granite = window.__granite || {};',
      `window.__granite.shared = { buildNumber: ${JSON.stringify(buildNumber)} };`,
    ].join('\n');
  },
  graniteAppEnvironment: ({
    appName,
    scheme,
    buildNumber,
  }: {
    appName: string;
    scheme: string;
    buildNumber: string;
  }) => {
    return [
      'window.__granite = window.__granite || {};',
      `window.__granite.app = { name: ${JSON.stringify(appName)}, scheme: ${JSON.stringify(scheme)}, buildNumber: ${JSON.stringify(buildNumber)} };`,
    ].join('\n');
  },
};
