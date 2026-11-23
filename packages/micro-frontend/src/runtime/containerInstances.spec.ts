import { afterEach, describe, expect, it } from 'vitest';
import {
  ContainerDefinitionNotFoundError,
  defineContainer,
  getContainerDefinition,
  instantiateContainer,
  removeContainerDefinition,
} from './containerInstances';
import { getMicroFrontendGlobalContext } from './globalContext';

type Registry = Record<string, unknown>;

/** A bundle body like the one containerInit() emits: registers its container under its app name, like the prelude. */
function bundleBody(appName: string, log: string[], options: { fail?: () => boolean } = {}) {
  let moduleRuns = 0;
  return (evaluation: { evalId: string }) => {
    moduleRuns += 1;
    const state = { evalId: evaluation.evalId, run: moduleRuns };
    log.push(evaluation.evalId);
    const context = getMicroFrontendGlobalContext();
    const containers = context.__CONTAINERS__ as Registry;
    const instances = context.__INSTANCES__ as unknown[] & Registry;
    if (containers[appName] != null || typeof instances[appName] === 'number') {
      throw new Error(`App container '${appName}' is already registered`);
    }
    Reflect.defineProperty(instances, appName, { configurable: true, value: instances.length });
    instances.push({ name: appName });
    containers[appName] = { appName, config: {}, exposedModules: { './App': state } };
    if (options.fail?.()) {
      throw new Error('module threw');
    }
  };
}

function evaluate(appName: string, evalId: string, body: ReturnType<typeof bundleBody>) {
  defineContainer({ appName, evalId, sourceUrl: `${appName}.hbc` }, body);
  body({ evalId });
}

afterEach(() => {
  for (const appName of ['shopping', 'bare']) {
    removeContainerDefinition(appName);
    const context = getMicroFrontendGlobalContext();
    Reflect.deleteProperty(context.__CONTAINERS__, appName);
    Reflect.deleteProperty(context.__INSTANCES__, appName);
  }
  getMicroFrontendGlobalContext().__INSTANCES__.length = 0;
});

describe('container instances', () => {
  it('runs the definition again for a new instance with its own evalId and module state', () => {
    const log: string[] = [];
    evaluate('shopping', 'e1', bundleBody('shopping', log));
    const first = getMicroFrontendGlobalContext().__CONTAINERS__.shopping;

    const a = instantiateContainer('shopping');
    const b = instantiateContainer('shopping');

    expect(log).toEqual(['e1', 'e1.1', 'e1.2']);
    expect([a.evalId, b.evalId]).toEqual(['e1.1', 'e1.2']);
    expect(a.instanceOf).toBe('e1');
    expect(a.container.exposedModules['./App']).not.toBe(b.container.exposedModules['./App']);
    // The app's own container keeps its slot: importApp still returns the first instance.
    expect(getMicroFrontendGlobalContext().__CONTAINERS__.shopping).toBe(first);
    expect(getMicroFrontendGlobalContext().__INSTANCES__).toHaveLength(1);
  });

  it('leaves the registry as it was when an instance run throws', () => {
    let failing = false;
    evaluate('shopping', 'e1', bundleBody('shopping', [], { fail: () => failing }));
    const first = getMicroFrontendGlobalContext().__CONTAINERS__.shopping;

    failing = true;
    expect(() => instantiateContainer('shopping')).toThrow('module threw');
    failing = false;

    expect(getMicroFrontendGlobalContext().__CONTAINERS__.shopping).toBe(first);
    expect(getMicroFrontendGlobalContext().__INSTANCES__).toHaveLength(1);
    expect(instantiateContainer('shopping').evalId).toBe('e1.2');
  });

  it('uses the newest definition of the app', () => {
    const log: string[] = [];
    evaluate('shopping', 'v1', bundleBody('shopping', log));
    Reflect.deleteProperty(getMicroFrontendGlobalContext().__CONTAINERS__, 'shopping');
    Reflect.deleteProperty(getMicroFrontendGlobalContext().__INSTANCES__, 'shopping');
    evaluate('shopping', 'v2', bundleBody('shopping', log));

    expect(getContainerDefinition('shopping')?.evalId).toBe('v2');
    expect(instantiateContainer('shopping').instanceOf).toBe('v2');
  });

  it('fails for an app without a definition', () => {
    expect(() => instantiateContainer('bare')).toThrow(ContainerDefinitionNotFoundError);
  });

  it('ignores definitions without an app name, evalId or body', () => {
    defineContainer({ appName: 'shopping' }, () => undefined);
    defineContainer({ appName: 'shopping', evalId: 'e1' }, undefined);
    expect(getContainerDefinition('shopping')).toBeUndefined();
  });
});
