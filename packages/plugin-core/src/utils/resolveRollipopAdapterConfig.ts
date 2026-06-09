import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import type { Config as RollipopConfig, Plugin as RollipopPlugin } from 'rollipop';
import type {
  AliasConfig,
  BuildConfig,
  PluginConfigContext,
  ProtocolConfig,
  ResolvedPluginConfig,
} from '../types';
import type { CompleteGraniteConfig } from '../schema/pluginConfig';
import { resolveConfig } from './resolveConfig';

const moduleRequire = createRequire(import.meta.url);
const GRANITE_ROLLIPOP_ENTRY_FILE = 'rollipop-entry.ts';

type EsbuildConfig = NonNullable<BuildConfig['esbuild']>;
type EsbuildBanner = EsbuildConfig['banner'] | EsbuildConfig['footer'];
type RollipopLoadResult = {
  code: string;
  moduleType: ReturnType<typeof toRollipopModuleType>;
};

export async function resolveRollipopAdapterConfig(
  config: CompleteGraniteConfig,
  context: PluginConfigContext
): Promise<RollipopConfig> {
  const resolvedConfig = await resolveConfig(config, context);

  return {
    root: config.cwd,
    entry: resolveRollipopEntryFile(config.cwd, config.entryFile),
    serializer: resolveSerializerConfig(resolvedConfig),
    transformer: resolveTransformerConfig(resolvedConfig),
    optimization: resolveOptimizationConfig(resolvedConfig),
    devMode: resolveDevModeConfig(config.cwd),
    runtimeTarget: resolveRuntimeTarget(config.cwd),
    experimental: {
      nativeTransformPipeline: true,
      flow: {
        requireDirective: false,
      },
    },
    plugins: [graniteAdapterPlugin(resolvedConfig)],
  };
}

function resolveRollipopEntryFile(cwd: string, entryFile: string) {
  const entryPath = path.join(cwd, '.granite', GRANITE_ROLLIPOP_ENTRY_FILE);
  const code = createEntryCode(entryFile);

  fs.mkdirSync(path.dirname(entryPath), { recursive: true });

  if (!fs.existsSync(entryPath) || fs.readFileSync(entryPath, 'utf-8') !== code) {
    fs.writeFileSync(entryPath, code);
  }

  return entryPath;
}

function resolveRuntimeTarget(cwd: string): RollipopConfig['runtimeTarget'] | undefined {
  const reactNativeVersion = resolveReactNativeVersion(cwd);
  const parsed = parseReactNativeVersion(reactNativeVersion);

  if (parsed == null) {
    return undefined;
  }

  return isLegacyReactNativeVersion(parsed) ? 'hermes' : undefined;
}

function resolveDevModeConfig(cwd: string): RollipopConfig['devMode'] | undefined {
  const reactNativeVersion = resolveReactNativeVersion(cwd);
  const parsed = parseReactNativeVersion(reactNativeVersion);

  if (parsed == null || !isLegacyReactNativeVersion(parsed)) {
    return undefined;
  }

  return {
    hmr: {
      runtimeImplement: fs.readFileSync(moduleRequire.resolve('rollipop/hmr-runtime'), 'utf-8'),
      clientImplement: createLegacyHmrClientImplement(),
    },
  };
}

function createLegacyHmrClientImplement() {
  return fs
    .readFileSync(moduleRequire.resolve('rollipop/hmr-client'), 'utf-8')
    .replace("import DevLoadingView from './DevLoadingView';", "import LoadingView from './LoadingView';")
    .replace(/\bDevLoadingView\b/g, 'LoadingView')
    .replace(
      "LoadingView.showMessage('Fast Refresh disconnected. Reload app to reconnect.', 'error', {",
      "LoadingView.showMessage('Fast Refresh disconnected. Reload app to reconnect.', 'load', {"
    );
}

function parseReactNativeVersion(version: string | undefined): { major: number; minor: number } | undefined {
  const parsed = version?.match(/^(\d+)\.(\d+)\./);

  if (parsed == null) {
    return undefined;
  }

  return {
    major: Number(parsed[1]),
    minor: Number(parsed[2]),
  };
}

function isLegacyReactNativeVersion(version: { major: number; minor: number }) {
  return version.major === 0 && version.minor < 84;
}

function resolveReactNativeVersion(cwd: string): string | undefined {
  try {
    const require = createRequire(path.join(cwd, 'package.json'));
    const packageJsonPath = require.resolve('react-native/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      version?: unknown;
    };

    return typeof packageJson.version === 'string' ? packageJson.version : undefined;
  } catch {
    return undefined;
  }
}

function resolveSerializerConfig(config: ResolvedPluginConfig): RollipopConfig['serializer'] {
  const esbuild = config.esbuild;
  const metro = config.metro;
  const metroPolyfills = metro?.serializer?.getPolyfills?.() ?? [];
  const banner = getJavaScriptBanner(esbuild?.banner);
  const footer = getJavaScriptBanner(esbuild?.footer);

  return {
    prelude: [...(esbuild?.prelude ?? []), ...metroPolyfills],
    ...(banner == null ? null : { banner }),
    ...(footer == null ? null : { footer }),
  };
}

function resolveTransformerConfig(config: ResolvedPluginConfig): RollipopConfig['transformer'] {
  const define = config.esbuild?.define;

  return define == null ? undefined : { define };
}

function resolveOptimizationConfig(config: ResolvedPluginConfig): RollipopConfig['optimization'] {
  const minify = config.esbuild?.minify;

  return minify == null ? undefined : { minify };
}

function getJavaScriptBanner(banner: EsbuildBanner | undefined): string | undefined {
  if (typeof banner === 'object' && banner != null && 'js' in banner) {
    const value = banner.js;
    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
}

function graniteAdapterPlugin(config: ResolvedPluginConfig): RollipopPlugin {
  const resolver = config.resolver;
  const transformer = config.transformer;

  return {
    name: 'granite:rollipop-adapter',
    configResolved(rollipopConfig) {
      if (!usesSharedReactNative(config)) {
        return;
      }

      const initializeCorePath = path.join(
        rollipopConfig.reactNative.reactNativePath,
        'Libraries/Core/InitializeCore.js'
      );

      rollipopConfig.serializer.prelude = rollipopConfig.serializer.prelude.filter((preludePath) => {
        return path.resolve(preludePath) !== path.resolve(initializeCorePath);
      });
    },
    async resolveId(source, importer) {
      const aliased = resolveAlias(resolver?.alias, source);
      const resolvedSource = aliased ?? source;

      if (isProtocolId(resolver?.protocols, resolvedSource)) {
        return resolvedSource;
      }

      if (aliased == null) {
        return;
      }

      return (await this.resolve(aliased, importer, { skipSelf: true })) ?? aliased;
    },
    async load(id) {
      const loaded = await loadProtocol(resolver?.protocols, id);

      if (loaded == null) {
        return;
      }

      return loaded;
    },
    async transform(code, id) {
      if (transformer == null) {
        return;
      }

      let transformedCode = code;
      transformedCode = transformer.transformSync?.(id, transformedCode) ?? transformedCode;
      transformedCode = (await transformer.transformAsync?.(id, transformedCode)) ?? transformedCode;

      if (transformedCode === code) {
        return;
      }

      return { code: transformedCode, map: null };
    },
  };
}

function usesSharedReactNative(config: ResolvedPluginConfig) {
  return config.resolver?.alias?.some((alias) => {
    return (
      alias.from === 'react-native' &&
      typeof alias.to === 'string' &&
      alias.to.startsWith('virtual-shared:react-native')
    );
  });
}

function createEntryCode(entryFile: string) {
  return [
    `import { register } from '@granite-js/react-native';`,
    `import App from ${JSON.stringify(entryFile)};`,
    ``,
    `register(App);`,
  ].join('\n');
}

function resolveAlias(aliases: AliasConfig[] | undefined, source: string): string | undefined {
  for (const alias of aliases ?? []) {
    const suffix = getAliasSuffix(alias, source);

    if (suffix == null || typeof alias.to === 'function') {
      continue;
    }

    const target = typeof alias.to === 'string' ? alias.to : alias.to.path;
    return alias.exact ? target : `${target}${suffix}`;
  }

  return undefined;
}

function getAliasSuffix(alias: AliasConfig, source: string): string | undefined {
  if (alias.exact) {
    return source === alias.from ? '' : undefined;
  }

  if (source === alias.from) {
    return '';
  }

  return source.startsWith(`${alias.from}/`) ? source.slice(alias.from.length) : undefined;
}

function isProtocolId(protocols: ProtocolConfig | undefined, id: string): boolean {
  return getProtocol(protocols, id) != null;
}

async function loadProtocol(
  protocols: ProtocolConfig | undefined,
  id: string
): Promise<RollipopLoadResult | undefined> {
  const matched = getProtocol(protocols, id);

  if (matched == null) {
    return undefined;
  }

  const { name, path, protocol } = matched;
  const resolvedPath = protocol.resolve == null ? path : await protocol.resolve({ path: path } as any);
  const loaded = await protocol.load({ path: resolvedPath, namespace: name } as any);

  if (loaded == null || loaded.contents == null) {
    return undefined;
  }

  return {
    code: String(loaded.contents),
    moduleType: toRollipopModuleType(loaded.loader),
  };
}

function getProtocol(protocols: ProtocolConfig | undefined, id: string) {
  const matched = id.match(/^([a-zA-Z][a-zA-Z\d+.-]*):(.*)$/);

  if (matched == null) {
    return undefined;
  }

  const [, name, protocolPath] = matched;

  if (name == null || protocolPath == null) {
    return undefined;
  }

  const protocol = protocols?.[name];

  if (protocol == null) {
    return undefined;
  }

  return { name, path: protocolPath, protocol };
}

function toRollipopModuleType(loader: unknown) {
  switch (loader) {
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'json':
    case 'text':
    case 'base64':
    case 'dataurl':
    case 'binary':
    case 'empty':
      return loader;
    default:
      return 'js';
  }
}
