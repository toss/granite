import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { createSharedResolverConfig } from './resolver';
import { getPreludeConfig } from '../plugin-utils/prelude';
import { getMicroFrontendRuntimeContext, registerShared } from '../runtime/registry';

function publishGenerated(value: unknown): void {
  const config = getPreludeConfig({}, 'shared-host');
  vm.runInNewContext([config.banner, config.preludeScript, 'registerShared("shared", value);'].join('\n'), {
    global: globalThis,
    value,
  });
}

async function consume(entry: { readonly get: () => unknown; readonly loaded: boolean }): Promise<object> {
  const config = createSharedResolverConfig([['shared', {}]]);
  const load = config.protocols?.['granite-micro-frontend-shared']?.load;
  if (load == null) {
    throw new Error('Expected the current shared resolver');
  }
  const result = await load({
    path: 'shared',
    namespace: 'granite-micro-frontend-shared',
    suffix: '',
    pluginData: undefined,
    with: {},
  });
  if (typeof result.contents !== 'string') {
    throw new Error('Expected executable resolver contents');
  }
  const module: { exports: unknown } = { exports: undefined };
  vm.runInNewContext(result.contents, {
    global: { __MICRO_FRONTEND__: { __SHARED__: { shared: entry } } },
    module,
  });
  if (typeof module.exports !== 'object' || module.exports == null) {
    throw new Error('Expected a consumer namespace');
  }
  return module.exports;
}

function registeredEntry() {
  const entry = getMicroFrontendRuntimeContext().sharedModules.shared;
  if (entry == null) {
    throw new Error('Expected a registered shared module');
  }
  return entry;
}

afterEach(() => Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__'));

describe.each([
  { name: 'runtime', publish: (value: unknown) => registerShared('shared', value) },
  { name: 'generated prelude', publish: publishGenerated },
])('$name current-consumer compatibility', ({ publish }) => {
  describe.each([false, true])('__esModule marker: %s', (marked) => {
    function namespace(exports: object): object {
      if (marked) {
        Object.defineProperty(exports, '__esModule', { value: true });
      }
      return Object.freeze(exports);
    }

    it('preserves default calls, named exports and singleton identity compared with the previous registration', async () => {
      const singleton = { count: 0 };
      const defaultExport = () => ++singleton.count;
      const value = namespace({ default: defaultExport, singleton });
      const descriptors = Object.getOwnPropertyDescriptors(value);
      // Before the fix, the publisher stored the namespace without normalization.
      const previous = await consume({ get: () => value, loaded: true });
      publish(value);
      const first = await consume(registeredEntry());
      const second = await consume(registeredEntry());

      for (const consumer of [previous, first, second]) {
        expect(Reflect.get(consumer, '__esModule')).toBe(true);
        expect(Reflect.get(consumer, 'default')).toBe(defaultExport);
        expect(Reflect.get(consumer, 'singleton')).toBe(singleton);
        expect(Reflect.get(consumer, 'default')()).toBeGreaterThan(0);
      }
      expect(singleton.count).toBe(3);
      expect(Object.getOwnPropertyDescriptors(value)).toEqual(descriptors);
    });

    it('preserves live bindings without evaluating export getters during publication or resolution', async () => {
      let current = 1;
      let reads = 0;
      const symbol = Symbol('named');
      const get = () => {
        reads += 1;
        return current;
      };
      const value = namespace(
        Object.defineProperties(
          {},
          {
            default: { enumerable: true, get },
            named: { enumerable: true, get },
            [symbol]: { enumerable: true, get },
            hidden: { get },
          }
        )
      );
      const previous = await consume({ get: () => value, loaded: true });
      publish(value);
      const consumer = await consume(registeredEntry());
      expect(reads).toBe(0);

      for (current of [2, 3]) {
        for (const key of ['default', 'named', symbol]) {
          expect(Reflect.get(consumer, key)).toBe(current);
          expect(Reflect.get(consumer, key)).toBe(Reflect.get(previous, key));
        }
      }
      expect(Reflect.has(consumer, 'hidden')).toBe(false);
    });

    it('keeps overrides local to each consumer without mutating the shared namespace', async () => {
      let current = 1;
      const symbol = Symbol('named');
      const value = namespace(
        Object.defineProperties(
          {},
          {
            default: { enumerable: true, get: () => current },
            named: { enumerable: true, get: () => current },
            [symbol]: { enumerable: true, get: () => current },
          }
        )
      );
      const previous = await consume({ get: () => value, loaded: true });
      publish(value);
      const first = await consume(registeredEntry());
      const second = await consume(registeredEntry());

      for (const key of ['default', 'named', symbol]) {
        expect(Reflect.set(first, key, 'mock')).toBe(true);
        expect(Reflect.set(previous, key, 'mock')).toBe(true);
      }
      current = 2;
      for (const key of ['default', 'named', symbol]) {
        expect(Reflect.get(first, key)).toBe(Reflect.get(previous, key));
        expect(Reflect.get(first, key)).toBe('mock');
        expect(Reflect.get(second, key)).toBe(2);
        expect(Reflect.get(value, key)).toBe(2);
      }
    });

    it.each([null, undefined])('does not replace an explicit %s default with the namespace', async (defaultValue) => {
      const value = namespace({ default: defaultValue, named: 'value' });
      const previous = await consume({ get: () => value, loaded: true });
      publish(value);
      const consumer = await consume(registeredEntry());
      expect(Reflect.has(consumer, 'default')).toBe(true);
      expect(Reflect.get(consumer, 'default')).toBe(defaultValue);
      expect(Reflect.get(consumer, 'default')).toBe(Reflect.get(previous, 'default'));
      expect(Reflect.get(consumer, 'named')).toBe('value');
    });

    it('leaves already loaded entries untouched when another runtime registers the same value', async () => {
      const value = namespace({ default: () => 'original' });
      const originalEntry = Object.freeze({ get: () => value, loaded: true });
      getMicroFrontendRuntimeContext().sharedModules.shared = originalEntry;
      const existingConsumer = await consume(originalEntry);

      publish(value);

      expect(registeredEntry()).toBe(originalEntry);
      expect(registeredEntry().get()).toBe(value);
      const nextConsumer = await consume(registeredEntry());
      expect(Reflect.get(nextConsumer, 'default')).toBe(Reflect.get(existingConsumer, 'default'));
    });
  });
});
