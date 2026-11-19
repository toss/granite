import { afterEach, describe, expect, it } from 'vitest';
import { installContainerInit, type MicroFrontendShareScope } from './containerInit';
import { getMicroFrontendGlobalContext } from './globalContext';

function initContainer(value: unknown): MicroFrontendShareScope | undefined {
  const fn = Reflect.get(getMicroFrontendGlobalContext(), 'initContainer') as (value: unknown) => unknown;
  return fn(value) as MicroFrontendShareScope | undefined;
}

afterEach(() => {
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
    expect(initContainer({ evalId: 'e1', appName: 'shopping' })?.get('react')).toBe('react');
    expect(() => initContainer({ evalId: 'e1', appName: 'shopping' })?.get('missing')).toThrow(
      'Shared module missing is not registered'
    );
  });

  it('lets the host hook give one container its own view of a shared module', () => {
    const seen: unknown[] = [];
    installContainerInit(({ container, shareScope }) => {
      seen.push(container);
      return {
        shareScope: {
          get(name) {
            switch (name) {
              case 'brick-module':
                return { scopedTo: container.evalId, base: shareScope.get(name) };
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

    const scope = initContainer({ evalId: 'e1', appName: 'shopping', sourceUrl: 'shopping.hbc' });
    expect(scope?.get('brick-module')).toEqual({ scopedTo: 'e1', base: 'brick' });
    expect(scope?.get('react')).toBe('react');
    expect(seen).toEqual([{ evalId: 'e1', appName: 'shopping', sourceUrl: 'shopping.hbc' }]);
  });

  it('ignores values that are not evaluation arguments', () => {
    installContainerInit(() => {
      throw new Error('must not run');
    });
    expect(initContainer(undefined)).toBeUndefined();
    expect(initContainer({ evalId: '', appName: 'shopping' })).toBeUndefined();
  });
});
