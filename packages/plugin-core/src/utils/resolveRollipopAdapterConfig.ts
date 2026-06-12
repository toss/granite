import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import type { Config as RollipopConfig, Plugin as RollipopPlugin } from 'rollipop';
import type { AliasConfig, BuildConfig, PluginConfigContext, ProtocolConfig, ResolvedPluginConfig } from '../types';
import type { CompleteGraniteConfig } from '../schema/pluginConfig';
import { resolveConfig } from './resolveConfig';
import { id, include } from 'rollipop/pluginutils';

const moduleRequire = createRequire(import.meta.url);
const GRANITE_ROLLIPOP_ENTRY_FILE = 'rollipop-entry.ts';
const REQUIRE_CONTEXT_PROTOCOL = 'require-context:';
const REQUIRE_CONTEXT_VIRTUAL_PREFIX = '\0granite:require-context?';

type EsbuildConfig = NonNullable<BuildConfig['esbuild']>;
type EsbuildBanner = EsbuildConfig['banner'] | EsbuildConfig['footer'];
type RollipopLoadResult = {
  code: string;
  moduleType: ReturnType<typeof toRollipopModuleType>;
};
interface RequireContextModule {
  moduleIndex: number;
  absolutePath: string;
  relativePath: string;
}
interface RequireContextSource {
  path: string;
  deep: boolean;
  filterSrc?: string;
  filterFlags?: string;
}

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
    },
    plugins: [requireContextPlugin(), graniteAdapterPlugin(resolvedConfig)],
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
    ...(banner == null ? null : { intro: banner }),
    ...(footer == null ? null : { outro: footer }),
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

function requireContextPlugin(): RollipopPlugin {
  return {
    name: 'granite:require-context',
    resolveId: {
      filter: [include(id(new RegExp(`^${REQUIRE_CONTEXT_PROTOCOL}.*`)))],
      async handler(source, importer) {
        if (importer == null) {
          throw new Error(`require.context importer가 주어져야 합니다.`);
        }

        const { path: contextPath, deep, filterSrc, filterFlags } = parseRequireContextSource(source);
        const importerDir = path.dirname(stripIdQuery(importer));
        const params = new URLSearchParams({
          contextPath,
          importerDir,
          deep: String(deep),
        });

        if (filterSrc != null) {
          params.set('filterSrc', filterSrc);
        }

        if (filterFlags != null) {
          params.set('filterFlags', filterFlags);
        }

        return `${REQUIRE_CONTEXT_VIRTUAL_PREFIX}${params.toString()}`;
      },
    },
    load: {
      filter: [include(id(new RegExp(`^${REQUIRE_CONTEXT_VIRTUAL_PREFIX}.*`)))],
      async handler(id) {
        const params = new URLSearchParams(id.slice(REQUIRE_CONTEXT_VIRTUAL_PREFIX.length));
        const contextPath = params.get('contextPath');
        const importerDir = params.get('importerDir');

        if (contextPath == null || importerDir == null) {
          throw new Error(`유효하지 않은 require.context 모듈입니다: ${id}`);
        }

        const deep = params.get('deep') !== 'false';
        const filterSrc = params.get('filterSrc');
        const filterFlags = params.get('filterFlags') ?? '';
        const filter = filterSrc == null ? undefined : new RegExp(filterSrc, filterFlags);
        const targetDir = path.resolve(importerDir, contextPath);
        const basePath = path.join(importerDir, contextPath);
        const allPaths = await getFilePaths(targetDir, deep);
        const filePaths =
          filter == null
            ? allPaths
            : allPaths.filter((filePath) => {
                filter.lastIndex = 0;
                return filter.test(path.basename(filePath));
              });

        return {
          code: getRequireContextScript(
            filePaths.map((filePath, index) => {
              const pagePath = path.relative(basePath, filePath);
              const normalizedPagePath = normalizePath(pagePath);

              return {
                moduleIndex: index,
                relativePath: normalizedPagePath.startsWith('.') ? normalizedPagePath : `./${normalizedPagePath}`,
                absolutePath: normalizePath(filePath),
              };
            })
          ),
          moduleType: 'js',
        };
      },
    },
    transform: {
      filter: [include(id(/require\.context\.tsx?(?:[?#].*)?$/))],
      async handler(code) {
        return {
          code: toRequireContextExportScript(code),
          map: null,
        };
      },
    },
  };
}

async function getFilePaths(rootDir: string, deep = true): Promise<string[]> {
  const dirents = await fs.promises.readdir(rootDir, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const dirent of dirents) {
    const filePath = path.join(rootDir, dirent.name);

    if (dirent.isDirectory()) {
      if (deep) {
        filePaths.push(...(await getFilePaths(filePath, deep)));
      }
      continue;
    }

    filePaths.push(filePath);
  }

  return filePaths;
}

function stripIdQuery(id: string) {
  return id.replace(/[?#].*$/, '');
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, '/');
}

function parseRequireContextSource(source: string): RequireContextSource {
  const rawPath = source.slice(REQUIRE_CONTEXT_PROTOCOL.length);
  const queryIndex = rawPath.indexOf('?');
  const contextPath = queryIndex === -1 ? rawPath : rawPath.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? '' : rawPath.slice(queryIndex + 1));

  return {
    path: contextPath,
    deep: params.get('deep') !== 'false',
    filterSrc: params.get('filterSrc') ?? undefined,
    filterFlags: params.get('filterFlags') ?? undefined,
  };
}

function toRequireContextExportScript(content: string) {
  const sources: RequireContextSource[] = [];
  let index = 0;

  const moduleBody = content
    .replace(
      /require\.context\((['"])(.*?)\1(?:\s*,\s*(true|false))?(?:\s*,\s*(\/.*?\/\w*))?\)/g,
      (_, _quote, sourcePath, deep, filterLiteral) => {
        const filterRegex = filterLiteral == null ? undefined : parseRegExpLiteral(filterLiteral);

        sources.push({
          path: sourcePath,
          deep: deep !== 'false',
          filterSrc: filterRegex?.source,
          filterFlags: filterRegex?.flags,
        });

        return `__context_${index++}__`;
      }
    )
    .replace(/\b(const|let)\b/g, 'var');

  if (sources.length === 0) {
    throw new Error('유효하지 않은 require context 구문입니다');
  }

  for (const source of sources) {
    if (source.path.length === 0) {
      throw new Error('유효하지 않은 require context 구문입니다');
    }
  }

  const importStatements = sources
    .map((source, sourceIndex) => {
      const query = buildRequireContextQueryString(source);
      return `import __context_${sourceIndex}__ from '${REQUIRE_CONTEXT_PROTOCOL}${source.path}${query}';`;
    })
    .join('\n');

  return `
${importStatements}

${moduleBody}
`.trim();
}

function parseRegExpLiteral(literal: string): RegExp {
  const match = literal.match(/^\/(.*)\/(\w*)$/);

  if (match == null || match[1] == null) {
    throw new Error(`유효하지 않은 정규식 리터럴: ${literal}`);
  }

  return new RegExp(match[1], match[2] ?? '');
}

function buildRequireContextQueryString(source: RequireContextSource): string {
  const params = new URLSearchParams();

  if (!source.deep) {
    params.set('deep', 'false');
  }

  if (source.filterSrc != null) {
    params.set('filterSrc', source.filterSrc);
  }

  if (source.filterFlags != null) {
    params.set('filterFlags', source.filterFlags);
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : '';
}

function getRequireContextScript(modules: RequireContextModule[]) {
  const importStatements = modules
    .map((module) => `import * as module${module.moduleIndex} from ${JSON.stringify(module.absolutePath)};`)
    .join('\n');
  const assignStatements = modules
    .map((module) => `_modules[${JSON.stringify(module.relativePath)}] = module${module.moduleIndex};`)
    .join('\n');

  return `
${importStatements}

var requireContext = function(key) {
  var _modules = {};

  ${assignStatements}

  return _modules[key];
};

requireContext.keys = function() {
  return [${modules.map((module) => JSON.stringify(module.relativePath)).join(',')}];
};

export default requireContext;
`.trim();
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
