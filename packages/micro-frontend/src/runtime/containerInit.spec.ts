import { afterEach, describe, expect, it } from 'vitest';
import { resetAppCopies } from './appInstances';
import { installContainerInit, type MicroFrontendShareScope } from './containerInit';
import { getMicroFrontendGlobalContext } from './globalContext';
import { instanceIdForDefinition, nextInstanceId, resetInstanceIds } from './instanceIds';

function initContainer(value: unknown): MicroFrontendShareScope | undefined {
  const fn = Reflect.get(getMicroFrontendGlobalContext(), 'initContainer') as (value: unknown) => unknown;
  return fn(value) as MicroFrontendShareScope | undefined;
}

afterEach(() => {
  resetInstanceIds();
  resetAppCopies();
  Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
});

describe('container init', () => {
  it('is not part of the enumerable global contract', () => {
    installContainerInit(undefined);
    expect(Object.keys(getMicroFrontendGlobalContext())).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
  });

  it('gives every container the host share scope without a hook', () => {
    installContainerInit(undefined);
    getMicroFrontendGlobalContext().__SHARED__.react = { get: () => 'react', loaded: true };
    expect(initContainer({ appName: 'shopping' })?.get('react')).toBe('react');
    expect(() => initContainer({ appName: 'shopping' })?.get('missing')).toThrow(
      'Shared module missing is not registered'
    );
  });

  it('lets the host hook give one container its own view of a shared module', () => {
    const seen: unknown[] = [];
    installContainerInit(({ container, shareScope }) => {
      seen.push({ instanceId: container.instanceId, appName: container.appName, sourceUrl: container.sourceUrl });
      return {
        shareScope: {
          get(name) {
            switch (name) {
              case 'brick-module':
                return { scopedTo: container.instanceId, base: shareScope.get(name) };
              default:
                return shareScope.get(name);
            }
          },
        },
      };
    });
    const shared = getMicroFrontendGlobalContext().__SHARED__;
    shared['brick-module'] = { get: () => 'brick', loaded: true };
    shared.react = { get: () => 'react', loaded: true };

    const scope = initContainer({ appName: 'shopping', sourceUrl: 'shopping.hbc' });
    expect(scope?.get('brick-module')).toEqual({ scopedTo: 'shopping@1', base: 'brick' });
    expect(scope?.get('react')).toBe('react');
    expect(seen).toEqual([{ instanceId: 'shopping@1', appName: 'shopping', sourceUrl: 'shopping.hbc' }]);
  });

  it('ignores values that are not evaluation arguments', () => {
    installContainerInit(() => {
      throw new Error('must not run');
    });
    expect(initContainer(undefined)).toBeUndefined();
    expect(initContainer({ evalId: 'e1' })).toBeUndefined();
    expect(initContainer({ evalId: 'e1', appName: '' })).toBeUndefined();
  });

  it('gives a first evaluation the id its definition issued, and an instance the id issued for it', () => {
    const seen: string[] = [];
    installContainerInit(({ container }) => {
      seen.push(container.instanceId);
    });
    // Native evaluates the bundle: the wrapper defines the container, then initializes it in the same run.
    instanceIdForDefinition('shopping');
    initContainer({ appName: 'shopping', sourceUrl: 'shopping.hbc' });
    // An older native evaluator passes its own id: ignored.
    instanceIdForDefinition('bare');
    initContainer({ evalId: '95299355399413-2', appName: 'bare' });
    // The runtime issues an instance's id and passes it to the run.
    initContainer({ instanceId: nextInstanceId('shopping'), appName: 'shopping' });

    expect(seen).toEqual(['shopping@1', 'bare@1', 'shopping@2']);
  });
});
