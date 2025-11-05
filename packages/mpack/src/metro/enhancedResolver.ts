import Module from 'module';
import path from 'path';
import type { AdditionalMetroConfig } from '@granite-js/plugin-core';
import enhancedResolve from 'enhanced-resolve';
import { RESOLVER_EXPORTS_MAP_CONDITIONS, RESOLVER_MAIN_FIELDS } from '../constants';

interface CustomResolutionContext {
  sourceExts: string[];
  originModulePath: string;
  preferNativePlatform?: boolean;
}

const SINGLETON_MODULES = ['@babel/runtime'];
const NATIVE_MODULES = ['react-native', 'react'];
const SUPPORTED_BUILTIN_FALLBACKS: Record<string, string> = {
  http: 'stream-http',
  https: 'https-browserify',
  zlib: 'browserify-zlib',
  url: 'url',
  util: 'util',
  path: 'path-browserify',
  buffer: 'buffer',
  stream: 'stream-browserify',
  assert: 'assert',
  events: 'events',
};

const builtinModules = new Set(Module.builtinModules);
const resolvers = new Map();

export function createResolver(rootPath: string, resolverConfig?: AdditionalMetroConfig['resolver']) {
  function createResolverImpl(context: CustomResolutionContext, platform: string | null, rootPath: string) {
    const baseExtensions = context.sourceExts.map((extension) => `.${extension}`);
    let finalExtensions = [...baseExtensions];

    if (context.preferNativePlatform) {
      finalExtensions = [...baseExtensions.map((extension) => `.native${extension}`), ...finalExtensions];
    }

    if (platform) {
      finalExtensions = [...baseExtensions.map((extension) => `.${platform}${extension}`), ...finalExtensions];
    }

    const resolver = enhancedResolve.create.sync({
      extensions: finalExtensions,
      mainFields: resolverConfig?.resolverMainFields ?? RESOLVER_MAIN_FIELDS,
      mainFiles: ['index'],
      conditionNames: resolverConfig?.unstable_conditionNames ?? [
        ...RESOLVER_EXPORTS_MAP_CONDITIONS,
        'require',
        'node',
        'default',
      ],
      modules: ['node_modules', path.join(rootPath, 'src')],
    });

    function resolve(context: CustomResolutionContext, request: string) {
      for (const nativeModule of NATIVE_MODULES) {
        if (request === nativeModule) {
          return {
            type: 'sourceFile',
            filePath: resolver({}, rootPath, request),
          };
        }
      }

      for (const singletonModule of SINGLETON_MODULES) {
        if (request.startsWith(singletonModule)) {
          return {
            type: 'sourceFile',
            filePath: resolver({}, rootPath, request),
          };
        }
      }

      if (builtinModules.has(request)) {
        if (request in SUPPORTED_BUILTIN_FALLBACKS) {
          const source = SUPPORTED_BUILTIN_FALLBACKS[request]!;
          return {
            type: 'sourceFile',
            filePath: require.resolve(`${source}/`),
          };
        }

        request = `${request}/`;
      }

      try {
        const resolveResult = resolver({}, path.dirname(context.originModulePath), request);

        return {
          type: 'sourceFile',
          filePath: resolveResult,
        };
      } catch (error) {
        const typedError = error as Error;

        // Only catch the error if it was caused by the resolution process
        if ('code' in typedError && typedError.code !== 'QUALIFIED_PATH_RESOLUTION_FAILED') {
          typedError.message = `"${context.originModulePath}"에서 "${request}"를 찾을 수 없었습니다.\n${typedError.message}`;
        }

        throw typedError;
      }
    }

    return resolve;
  }

  return function resolve(context: CustomResolutionContext, request: string, platform: string | null) {
    let resolver = resolvers.get(platform);

    if (resolver == null) {
      resolver = createResolverImpl(context, platform, rootPath);
      resolvers.set(platform, resolver);
    }

    return resolver(context, request, platform);
  };
}
