import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

const sourceRoot = fileURLToPath(new URL('.', import.meta.url));

// Give every module in a package copy its bundle URL, as the bundler does.
// Only the native router boundary is replaced; app attribution and registries run unchanged.
function bundleModules(sourceURL: string) {
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  function load(file: string): Record<string, unknown> {
    const cached = cache.get(file);
    if (cached != null) {
      return cached.exports;
    }
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    function requireModule(id: string): unknown {
      if (id === '@granite-js/react-native') {
        return { createRoute: (routePath: string) => ({ _path: routePath }), useNavigation: () => undefined };
      }
      if (id.startsWith('.')) {
        return load(path.resolve(path.dirname(file), `${id}.ts`));
      }
      return createRequire(file)(id);
    }
    const factory: unknown = vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
      filename: sourceURL,
    });
    if (typeof factory !== 'function') {
      throw new TypeError('Expected a module factory');
    }
    factory(requireModule, module, module.exports);
    return module.exports;
  }
  return (file: string, name: string) => {
    const value = load(path.join(sourceRoot, file))[name];
    if (typeof value !== 'function') {
      throw new TypeError(`Expected function export: ${name}`);
    }
    return (...args: unknown[]): unknown => Reflect.apply(value, undefined, args);
  };
}

function bootstrap(app: { name: string; scheme: string; host: string }, mode: 'modern' | 'without-routing' | 'legacy') {
  const sourceURL = `https://cdn.example.com/${app.name}.hbc`;
  const modules = bundleModules(sourceURL);
  const getPrelude = modules('plugin/prelude.ts', 'getPreludeConfig');
  const config = getPrelude({}, app.name);
  if (typeof config !== 'object' || config == null) {
    throw new TypeError('Expected prelude config');
  }
  const banner: unknown = Reflect.get(config, 'banner');
  const prelude: unknown = Reflect.get(config, 'preludeScript');
  if (typeof banner !== 'string' || typeof prelude !== 'string') {
    throw new TypeError('Expected prelude scripts');
  }
  Reflect.set(globalThis, '__granite', { app });
  vm.runInThisContext(`${banner}\n(function(){${prelude}})();`, { filename: sourceURL });
  if (mode !== 'modern') {
    const context = Reflect.get(globalThis, '__MICRO_FRONTEND__');
    const containers = Reflect.get(context, '__CONTAINERS__');
    const container = Reflect.get(containers, app.name);
    Reflect.deleteProperty(container.config, 'scheme');
    Reflect.deleteProperty(container.config, 'host');
    if (mode === 'legacy') {
      Reflect.deleteProperty(container, 'runtime');
      Reflect.deleteProperty(containers, app.name);
    }
  }
  return modules;
}

describe('route registration across bundle evaluations', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
    Reflect.deleteProperty(globalThis, '__granite');
  });

  it.each(['modern', 'without-routing', 'legacy'] as const)(
    'keeps deferred routes isolated with %s containers',
    (mode) => {
      // Given
      Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
      const first = bootstrap({ name: 'app-a', scheme: 'alpha', host: 'host-a' }, mode);
      const createFirstRoute = first('createRoute.ts', 'createRoute');
      const second = bootstrap({ name: 'app-b', scheme: 'beta', host: 'host-b' }, mode);
      const createSecondRoute = second('createRoute.ts', 'createRoute');
      const resolve = second('host/pendingHostComponentStore.ts', 'resolvePendingHostComponent');
      function PendingA() {
        return null;
      }
      function PendingB() {
        return null;
      }
      createSecondRoute('/product/:id', { component: PendingB, hostPendingComponent: PendingB });

      // When
      createFirstRoute('/product/:id', { component: PendingA, hostPendingComponent: PendingA });

      // Then
      if (mode === 'legacy') {
        expect(() => first('runtime/getAppName.ts', 'getAppName')()).toThrow(
          'Cannot resolve the current micro-frontend app name'
        );
      } else {
        expect(first('runtime/getAppName.ts', 'getAppName')()).toBe('app-a');
        expect(second('runtime/getAppName.ts', 'getAppName')()).toBe('app-b');
      }
      expect(resolve('alpha://host-a/app-a/product/1')).toMatchObject({ component: PendingA, appName: 'app-a' });
      expect(resolve('beta://host-b/app-b/product/2')).toMatchObject({ component: PendingB, appName: 'app-b' });
    }
  );
  it('uses container metadata when its route module is first evaluated after another app', () => {
    // Given
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
    const first = bootstrap({ name: 'app-a', scheme: 'alpha', host: 'host-a' }, 'modern');
    const second = bootstrap({ name: 'app-b', scheme: 'beta', host: 'host-b' }, 'modern');
    const createRoute = first('createRoute.ts', 'createRoute');
    const resolve = second('host/pendingHostComponentStore.ts', 'resolvePendingHostComponent');
    function PendingA() {
      return null;
    }

    // When
    createRoute('/product', { component: PendingA, hostPendingComponent: PendingA });

    // Then
    expect(resolve('alpha://host-a/app-a/product')).toMatchObject({ component: PendingA, appName: 'app-a' });
    expect(resolve('beta://host-b/app-b/product')).toBeNull();
  });

  it('does not register an unknown bundle under the last modern app', () => {
    // Given
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
    const app = bootstrap({ name: 'app-b', scheme: 'beta', host: 'host-b' }, 'modern');
    const unknown = bundleModules('https://cdn.example.com/unknown.hbc');
    const createRoute = unknown('createRoute.ts', 'createRoute');
    const resolve = app('host/pendingHostComponentStore.ts', 'resolvePendingHostComponent');
    function Pending() {
      return null;
    }

    // When
    createRoute('/product', { component: Pending, hostPendingComponent: Pending });

    // Then
    expect(resolve('beta://host-b/app-b/product')).toBeNull();
  });
});
