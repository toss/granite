import type { GranitePluginCore } from '@granite-js/plugin-core';

const RELEASE_PROFILER_DEV_BANNER = [
  'var __DEV__=true;',
  'global.__DEV__=true;',
  'var self=global.self=global.self||global;',
  'var window=global.window=global.window||global;',
  'var process=global.process=global.process||{};',
  'process.env=process.env||{};',
  'process.env.NODE_ENV="development";',
].join('');

const REACT_NATIVE_RCT_NETWORKING_MODULE =
  /[/\\]node_modules[/\\]react-native[/\\]Libraries[/\\]Network[/\\]RCTNetworking\.(ios|android)\.js$/;
const RCT_NETWORKING_TYPE_IMPORT = "import {type NativeResponseType} from './XMLHttpRequest';";

export interface ReleaseProfilerOptions {
  enabled?: boolean;
}

function removeRCTNetworkingTypeImport(id: string, code: string) {
  if (!REACT_NATIVE_RCT_NETWORKING_MODULE.test(id)) {
    return code;
  }

  return code.replace(`${RCT_NETWORKING_TYPE_IMPORT}\n`, '');
}

function transformReleaseProfilerRuntime(id: string, code: string) {
  return removeRCTNetworkingTypeImport(id, code);
}

export function releaseProfiler(options: ReleaseProfilerOptions = {}): GranitePluginCore {
  return {
    name: 'release-profiler',
    config: options.enabled
      ? {
          esbuild: {
            define: {
              __DEV__: 'true',
              'process.env.NODE_ENV': '"development"',
            },
            banner: {
              js: RELEASE_PROFILER_DEV_BANNER,
            },
          },
          transformer: {
            transformSync: transformReleaseProfilerRuntime,
          },
        }
      : undefined,
  };
}
