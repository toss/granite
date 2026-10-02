import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { createSharedResolverConfig } from './resolver';

async function getSharedResolverContents(moduleName: string): Promise<string> {
  const config = createSharedResolverConfig([[moduleName, {}]]);
  const load = config.protocols?.['granite-micro-frontend-shared']?.load;
  if (load == null) {
    throw new Error('Shared resolver did not provide a loader');
  }
  const result = await load({
    path: moduleName,
    namespace: 'granite-micro-frontend-shared',
    suffix: '',
    pluginData: undefined,
    with: {},
  });
  const contents = result.contents;
  if (typeof contents !== 'string') {
    throw new Error('Shared resolver did not generate executable JavaScript');
  }
  return contents;
}

describe('createSharedResolverConfig', () => {
  it('creates a lazy shared-module forwarding loader', async () => {
    // Given
    const moduleName = 'react-native-pager-view';
    const contents = await getSharedResolverContents(moduleName);

    // When
    const generatedModule = { exports: undefined };
    vm.runInNewContext(contents, {
      global: {
        __MICRO_FRONTEND__: {
          __SHARED__: {
            [moduleName]: {
              get: () => ({ default: 'default export', named: 'named export' }),
              loaded: true,
            },
          },
        },
      },
      module: generatedModule,
    });

    // Then
    expect(generatedModule.exports).toMatchObject({
      default: 'default export',
      named: 'named export',
    });
  });

  it('reads a missing shared key once before rejecting the generated resolver request', async () => {
    // Given
    const moduleName = 'missing-shared-module';
    const sharedRegistry = {};
    let lookupCount = 0;
    Object.defineProperty(sharedRegistry, moduleName, {
      configurable: true,
      enumerable: true,
      get: () => {
        lookupCount += 1;
        return undefined;
      },
    });
    const generatedModule = { exports: undefined };
    const contents = await getSharedResolverContents(moduleName);

    // When
    const resolveMissingModule = () =>
      vm.runInNewContext(contents, {
        global: { __MICRO_FRONTEND__: { __SHARED__: sharedRegistry } },
        module: generatedModule,
      });

    // Then
    expect(resolveMissingModule).toThrow(`Shared module ${moduleName} is not registered`);
    expect(lookupCount).toBe(1);
  });
});
