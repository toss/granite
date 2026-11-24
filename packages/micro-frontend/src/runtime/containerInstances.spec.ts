import { afterEach, describe, expect, it } from 'vitest';
import {
  ContainerDefinitionNotFoundError,
  defineContainer,
  getContainerDefinition,
  createContainerInstance,
  removeContainerDefinition,
} from './containerInstances';
import { getMicroFrontendGlobalContext } from './globalContext';
import { resetInstanceIds } from './instanceIds';

type Registry = Record<string, unknown>;

/** A bundle body like the one containerInit() emits: registers its container under its app name, like the prelude. */
function bundleBody(appName: string, log: string[], options: { fail?: () => boolean } = {}) {
  let moduleRuns = 0;
  return (evaluation: { instanceId?: string }) => {
    moduleRuns += 1;
    // Native calls the first evaluation with `{ sourceUrl }` only; instance runs carry the id issued for them.
    const instanceId = evaluation.instanceId ?? 'native';
    const state = { instanceId, run: moduleRuns };
    log.push(instanceId);
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

/** Like native evaluating the bundle: the wrapper defines the container, then the first evaluation runs. */
function evaluate(appName: string, body: ReturnType<typeof bundleBody>, nativeEvalId?: string) {
  // Older native evaluators passed their own `evalId`; it is ignored.
  defineContainer({ appName, evalId: nativeEvalId, sourceUrl: `${appName}.hbc` }, body);
  body({});
}

afterEach(() => {
  resetInstanceIds();
  for (const appName of ['shopping', 'bare']) {
    removeContainerDefinition(appName);
    const context = getMicroFrontendGlobalContext();
    Reflect.deleteProperty(context.__CONTAINERS__, appName);
    Reflect.deleteProperty(context.__INSTANCES__, appName);
  }
  getMicroFrontendGlobalContext().__INSTANCES__.length = 0;
});

describe('container instances', () => {
  it('runs the definition again for a new instance with its own instanceId and module state', () => {
    const log: string[] = [];
    evaluate('shopping', bundleBody('shopping', log));
    const first = getMicroFrontendGlobalContext().__CONTAINERS__.shopping;

    const a = createContainerInstance('shopping');
    const b = createContainerInstance('shopping');

    expect(getContainerDefinition('shopping')?.instanceId).toBe('shopping@1');
    expect(log).toEqual(['native', 'shopping@2', 'shopping@3']);
    expect([a.instanceId, b.instanceId]).toEqual(['shopping@2', 'shopping@3']);
    expect(a.instanceOf).toBe('shopping@1');
    expect(a.container.exposedModules['./App']).not.toBe(b.container.exposedModules['./App']);
    // The app's own container keeps its slot: importApp still returns the first instance.
    expect(getMicroFrontendGlobalContext().__CONTAINERS__.shopping).toBe(first);
    expect(getMicroFrontendGlobalContext().__INSTANCES__).toHaveLength(1);
  });

  it('leaves the registry as it was when an instance run throws', () => {
    let failing = false;
    evaluate('shopping', bundleBody('shopping', [], { fail: () => failing }));
    const first = getMicroFrontendGlobalContext().__CONTAINERS__.shopping;

    failing = true;
    expect(() => createContainerInstance('shopping')).toThrow('module threw');
    failing = false;

    expect(getMicroFrontendGlobalContext().__CONTAINERS__.shopping).toBe(first);
    expect(getMicroFrontendGlobalContext().__INSTANCES__).toHaveLength(1);
    // The failed run used shopping@2; numbers are never reused.
    expect(createContainerInstance('shopping').instanceId).toBe('shopping@3');
  });

  it('uses the newest definition of the app', () => {
    const log: string[] = [];
    evaluate('shopping', bundleBody('shopping', log));
    Reflect.deleteProperty(getMicroFrontendGlobalContext().__CONTAINERS__, 'shopping');
    Reflect.deleteProperty(getMicroFrontendGlobalContext().__INSTANCES__, 'shopping');
    evaluate('shopping', bundleBody('shopping', log));

    expect(getContainerDefinition('shopping')?.instanceId).toBe('shopping@2');
    expect(createContainerInstance('shopping')).toMatchObject({ instanceId: 'shopping@3', instanceOf: 'shopping@2' });
  });

  it('fails for an app without a definition', () => {
    expect(() => createContainerInstance('bare')).toThrow(ContainerDefinitionNotFoundError);
  });

  it('numbers instanceIds per app, and ignores the id an older native evaluator passes', () => {
    evaluate('shopping', bundleBody('shopping', []), '95299355399413-1');
    evaluate('bare', bundleBody('bare', []), '95299355399413-2');

    expect(getContainerDefinition('shopping')?.instanceId).toBe('shopping@1');
    expect(getContainerDefinition('bare')?.instanceId).toBe('bare@1');
    expect(createContainerInstance('shopping').instanceId).toBe('shopping@2');
    expect(createContainerInstance('bare').instanceId).toBe('bare@2');
  });

  it('ignores definitions without an app name or body', () => {
    defineContainer({ instanceId: 'e1' }, () => undefined);
    defineContainer({ appName: 'shopping' }, undefined);
    expect(getContainerDefinition('shopping')).toBeUndefined();
  });
});
