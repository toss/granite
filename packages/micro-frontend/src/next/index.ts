import * as path from 'node:path';
import type { Plugin, PluginOption } from 'rollipop';
import { code, include } from 'rollipop/filter';
import type { MicroFrontendPluginOptions } from './types';
import { transformDisposeOwnership } from '../plugin-utils/disposeTransform';
import { intoShared } from '../plugin-utils/intoShared';
import { getPreludeConfig } from '../plugin-utils/prelude';
import type { SharedConfig } from '../runtime/registry';

const PRELUDE = '\0granite:micro-frontend';
const SHARED = '\0granite:shared:';

export function microFrontend(options: MicroFrontendPluginOptions): PluginOption {
  const shared = intoShared(options.shared);
  const external = new Set(
    Object.entries(shared ?? {})
      .filter(([, value]) => value.eager !== true)
      .map(([name]) => name)
  );
  return [prelude(options, shared), external.size > 0 && sharedModules(external), dispose(options.appName)];
}

function prelude(options: MicroFrontendPluginOptions, shared: SharedConfig | undefined): Plugin {
  let preludeOptions: Parameters<typeof getPreludeConfig>[0] = {};
  const lazyShared = Object.entries(shared ?? {})
    .filter(([, config]) => config.eager === true && config.lazy === true)
    .map(([name]) => name);

  return {
    name: 'granite:micro-frontend:prelude',
    config(config) {
      const root = config.root ?? process.cwd();
      const exposes = Object.fromEntries(
        Object.entries(options.exposes ?? {}).map(([name, file]) => [name, path.resolve(root, file)])
      );
      preludeOptions = { ...options, shared, exposes };
      const generated = getPreludeConfig(preludeOptions, options.appName);
      // Must run before the native-module proxy and before any exposed app module.
      config.polyfills = [
        { type: 'plain', code: `var global = globalThis;\n${generated.banner}` },
        ...(config.polyfills ?? []),
      ];
      return { prelude: [PRELUDE] };
    },
    resolveId: {
      filter: { id: /^\0granite:micro-frontend$/ },
      handler() {
        return PRELUDE;
      },
    },
    load: {
      filter: { id: /^\0granite:micro-frontend$/ },
      async handler() {
        // Lazy shared modules are registered through named imports, so the export names are needed here.
        const lazySharedExports = new Map<string, readonly string[]>();
        for (const name of lazyShared) {
          const resolved = await this.resolve(name, PRELUDE);
          const exportNames =
            resolved == null || resolved.external ? null : await collectExportNames(this, resolved.id);
          if (exportNames == null || exportNames.length === 0) {
            this.warn(
              `Lazy shared module '${name}' is loaded with require() because its ESM export names are unknown. ` +
                'The bundler keeps its re-exports, so the bundle can be larger than with an eager registration.'
            );
            continue;
          }
          lazySharedExports.set(name, exportNames);
        }
        return getPreludeConfig(preludeOptions, options.appName, { lazySharedExports }).preludeScript;
      },
    },
  };
}

type PluginContext = ThisParameterType<Extract<NonNullable<Plugin['load']>, (...args: never[]) => unknown>>;
type ExportCollectorContext = Pick<PluginContext, 'load' | 'parse' | 'resolve'>;

/**
 * Returns the names an ESM module exports, following `export * from` into the modules it re-exports.
 * Returns null when a name can come from a CommonJS module or cannot be found statically.
 */
async function collectExportNames(
  context: ExportCollectorContext,
  id: string,
  visited = new Set<string>()
): Promise<string[] | null> {
  if (visited.has(id)) {
    return [];
  }
  visited.add(id);
  const info = await context.load({ id });
  if (info.inputFormat !== 'es' || info.code == null) {
    return null;
  }
  const names = new Set(info.exports.filter((name) => name !== '*'));
  if (!info.exports.includes('*')) {
    return [...names];
  }
  let program: ReturnType<ExportCollectorContext['parse']>;
  try {
    program = context.parse(info.code, { lang: parserLanguage(id) });
  } catch {
    return null;
  }
  for (const node of program.body) {
    if (node.type !== 'ExportAllDeclaration' || node.exported != null || node.exportKind === 'type') {
      continue;
    }
    const resolved = await context.resolve(String(node.source.value), id);
    if (resolved == null || resolved.external) {
      return null;
    }
    const reexported = await collectExportNames(context, resolved.id, visited);
    if (reexported == null) {
      return null;
    }
    // `export *` never re-exports `default`.
    for (const name of reexported) {
      if (name !== 'default') {
        names.add(name);
      }
    }
  }
  return [...names];
}

function parserLanguage(id: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  const extension = path.extname(id.split('?')[0] ?? id);
  if (extension === '.ts' || extension === '.mts' || extension === '.cts') {
    return 'ts';
  }
  if (extension === '.tsx') {
    return 'tsx';
  }
  return 'jsx';
}

function sharedModules(external: ReadonlySet<string>): Plugin {
  const externalPattern = new RegExp(
    `^(?:${[...external].map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`
  );

  return {
    name: 'granite:micro-frontend:shared-modules',
    // Fails the remote bundle before any module runs when the host did not register a shared module
    // the bundle uses. Without this, the check runs only when a facade is first required, which can
    // be much later when the bundler defers imports until their first use.
    intro(chunk) {
      const names = chunk.moduleIds
        .filter((id) => id.startsWith(SHARED))
        .map((id) => id.slice(SHARED.length))
        .sort();
      return names.length === 0 ? '' : createSharedModuleCheck(names);
    },
    resolveId: {
      filter: { id: externalPattern },
      handler(source) {
        return external.has(source) ? `${SHARED}${source}` : undefined;
      },
    },
    load: {
      filter: { id: /^\0granite:shared:/ },
      handler(id) {
        const name = JSON.stringify(id.slice(SHARED.length));
        return `
          var shared = globalThis.__MICRO_FRONTEND__.__SHARED__[${name}];
          if (!shared) throw new Error('Shared module ' + ${name} + ' is not registered');
          var original = shared.get();
          var facade = {};
          if (original != null) for (const key of Reflect.ownKeys(original)) {
            if (key === '__esModule' || !Object.getOwnPropertyDescriptor(original, key)?.enumerable) continue;
            Object.defineProperty(facade, key, { enumerable: true, configurable: true,
              get() { return original[key]; },
              set(value) { Object.defineProperty(facade, key, { value, writable: true, enumerable: true, configurable: true }); }
            });
          }
          Object.defineProperty(facade, '__esModule', { value: true, writable: true, enumerable: true, configurable: true });
          module.exports = facade;
        `;
      },
    },
  };
}

function createSharedModuleCheck(names: readonly string[]): string {
  return [
    '(function (names) {',
    '  var registry = globalThis.__MICRO_FRONTEND__ && globalThis.__MICRO_FRONTEND__.__SHARED__;',
    '  for (var i = 0; i < names.length; i++) {',
    "    if (registry == null || registry[names[i]] == null) throw new Error('Shared module ' + names[i] + ' is not registered');",
    '  }',
    `})(${JSON.stringify(names)});`,
  ].join('\n');
}

function dispose(appName: string): Plugin {
  return {
    name: 'granite:micro-frontend:dispose',
    transform: {
      filter: [include(code(/(?:global|globalThis)\.__MICRO_FRONTEND__\.dispose/))],
      handler(source, id) {
        const transformed = transformDisposeOwnership(id, source, { appName });
        return source === transformed ? null : { code: transformed, map: null };
      },
    },
  };
}

export type { MicroFrontendPluginOptions } from './types';
