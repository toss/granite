import { afterEach, describe, expect, it } from 'vitest';
import {
  ContainerDefinitionNotFoundError,
  defineContainer,
  getContainerDefinition,
  instantiateContainer,
  removeContainerDefinition,
} from './containerInstances';
import { resetEvalIds } from './evalIds';
import { getMicroFrontendGlobalContext } from './globalContext';

type Registry = Record<string, unknown>;

/** A bundle body like the one containerInit() emits: registers its container under its app name, like the prelude. */
function bundleBody(appName: string, log: string[], options: { fail?: () => boolean } = {}) {
  let moduleRuns = 0;
  return (evaluation: { evalId?: string }) => {
    moduleRuns += 1;
    // Native calls the first evaluation with `{ sourceUrl }` only; instance runs carry the evalId issued for them.
    const evalId = evaluation.evalId ?? 'native';
    const state = { evalId, run: moduleRuns };
    log.push(evalId);
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
  defineContainer({ appName, evalId: nativeEvalId, sourceUrl: `${appName}.hbc` }, body);
  body({});
}

afterEach(() => {
  resetEvalIds();
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
    evaluate('shopping', bundleBody('shopping', log));
    const first = getMicroFrontendGlobalContext().__CONTAINERS__.shopping;

    const a = instantiateContainer('shopping');
    const b = instantiateContainer('shopping');

    expect(getContainerDefinition('shopping')?.evalId).toBe('shopping@1');
    expect(log).toEqual(['native', 'shopping@2', 'shopping@3']);
    expect([a.evalId, b.evalId]).toEqual(['shopping@2', 'shopping@3']);
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
    expect(() => instantiateContainer('shopping')).toThrow('module threw');
    failing = false;

    expect(getMicroFrontendGlobalContext().__CONTAINERS__.shopping).toBe(first);
    expect(getMicroFrontendGlobalContext().__INSTANCES__).toHaveLength(1);
    // The failed run used shopping@2; numbers are never reused.
    expect(instantiateContainer('shopping').evalId).toBe('shopping@3');
  });

  it('uses the newest definition of the app', () => {
    const log: string[] = [];
    evaluate('shopping', bundleBody('shopping', log));
    Reflect.deleteProperty(getMicroFrontendGlobalContext().__CONTAINERS__, 'shopping');
    Reflect.deleteProperty(getMicroFrontendGlobalContext().__INSTANCES__, 'shopping');
    evaluate('shopping', bundleBody('shopping', log));

    expect(getContainerDefinition('shopping')?.evalId).toBe('shopping@2');
    expect(instantiateContainer('shopping')).toMatchObject({ evalId: 'shopping@3', instanceOf: 'shopping@2' });
  });

  it('fails for an app without a definition', () => {
    expect(() => instantiateContainer('bare')).toThrow(ContainerDefinitionNotFoundError);
  });

  it('numbers evalIds per app, and ignores the id an older native evaluator passes', () => {
    evaluate('shopping', bundleBody('shopping', []), '95299355399413-1');
    evaluate('bare', bundleBody('bare', []), '95299355399413-2');

    expect(getContainerDefinition('shopping')?.evalId).toBe('shopping@1');
    expect(getContainerDefinition('bare')?.evalId).toBe('bare@1');
    expect(instantiateContainer('shopping').evalId).toBe('shopping@2');
    expect(instantiateContainer('bare').evalId).toBe('bare@2');
  });

  it('ignores definitions without an app name or body', () => {
    defineContainer({ evalId: 'e1' }, () => undefined);
    defineContainer({ appName: 'shopping' }, undefined);
    expect(getContainerDefinition('shopping')).toBeUndefined();
  });
});
