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
  return [
    createPreludePlugin(options, shared),
    external.size > 0 && createSharedModulesPlugin(external),
    createDisposePlugin(options.appName),
  ];
}

function createPreludePlugin(options: MicroFrontendPluginOptions, shared: SharedConfig | undefined): Plugin {
  let prelude = '';

  return {
    name: 'granite:micro-frontend:prelude',
    config(config) {
      const root = config.root ?? process.cwd();
      const exposes = Object.fromEntries(
        Object.entries(options.exposes ?? {}).map(([name, file]) => [name, path.resolve(root, file)])
      );
      const generated = getPreludeConfig({ ...options, shared, exposes }, options.appName);
      prelude = generated.preludeScript;
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
      handler() {
        return prelude;
      },
    },
  };
}

function createSharedModulesPlugin(external: ReadonlySet<string>): Plugin {
  const externalPattern = new RegExp(
    `^(?:${[...external].map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`
  );

  return {
    name: 'granite:micro-frontend:shared-modules',
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

function createDisposePlugin(appName: string): Plugin {
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
