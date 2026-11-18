import vm from 'node:vm';
import { flattenPluginOption, type Plugin } from 'rollipop';
import { describe, expect, it } from 'vitest';
import { microFrontend } from './index';

type Context = Record<string, unknown> & { globalThis?: unknown };

async function containerPlugin(options: Parameters<typeof microFrontend>[0]): Promise<Plugin | undefined> {
  const plugins = await flattenPluginOption(microFrontend(options));
  return plugins.find((plugin) => plugin.name === 'granite:micro-frontend:container-init');
}

async function wrap(code: string): Promise<string> {
  const plugin = (await containerPlugin({ appName: 'shopping', exposes: { './App': './src/App.tsx' } }))!;
  if (typeof plugin.renderChunk !== 'function') throw new Error('Missing renderChunk');
  const result = (await plugin.renderChunk.call({} as never, code, {} as never, {} as never, {} as never)) as {
    code: string;
  };
  return result.code;
}

async function sharedStub(name: string): Promise<string> {
  const plugins = await flattenPluginOption(microFrontend({ appName: 'shopping', shared: { [name]: {} } }));
  const shared = plugins.find((plugin) => plugin.name === 'granite:micro-frontend:shared-modules') as Plugin;
  const load = shared.load as { handler(id: string): string };
  return load.handler(`\0granite:shared:${name}`);
}

function run(code: string, context: Context): Context {
  context.globalThis = context;
  vm.runInNewContext(code, context);
  return context;
}

describe('container init (microFrontend plugin)', () => {
  it('is on for remote bundles, off for the host, and can be turned off', async () => {
    expect(await containerPlugin({ appName: 'shopping', exposes: { './App': './src/App.tsx' } })).toBeDefined();
    expect(await containerPlugin({ appName: 'shared', shared: { react: { eager: true } } })).toBeUndefined();
    expect(
      await containerPlugin({ appName: 'shopping', exposes: { './App': './src/App.tsx' }, containerInit: false })
    ).toBeUndefined();
  });

  it('runs the bundle immediately without a deferred native evaluator', async () => {
    const context = run(await wrap('globalThis.ran = __graniteShareScope;'), { __MICRO_FRONTEND__: {} });
    expect(context).toHaveProperty('ran', undefined);
  });

  it('hands the body to native, which initializes the container with its evaluation argument', async () => {
    const calls: unknown[] = [];
    const scope = { get: (name: string) => `scoped:${name}` };
    const context = run(await wrap('globalThis.ran = __graniteShareScope;'), {
      __GRANITE_DEFERRED_EVAL__: true,
      __MICRO_FRONTEND__: {
        initContainer: (container: unknown) => {
          calls.push(container);
          return scope;
        },
      },
    });
    expect(context).not.toHaveProperty('ran');
    const body = context.__GRANITE_DEFERRED_EVAL__ as (evaluation: unknown) => void;
    body({ evalId: 'e1', sourceUrl: 'shopping.hbc' });
    expect(calls).toEqual([{ evalId: 'e1', sourceUrl: 'shopping.hbc', appName: 'shopping' }]);
    expect(context.ran).toBe(scope);
  });

  it('keeps the host share scope when the host runtime has no initContainer', async () => {
    const context = run(await wrap('globalThis.ran = __graniteShareScope;'), {
      __GRANITE_DEFERRED_EVAL__: true,
      __MICRO_FRONTEND__: {},
    });
    (context.__GRANITE_DEFERRED_EVAL__ as (evaluation: unknown) => void)({ evalId: 'e1' });
    expect(context.ran).toBeUndefined();
  });

  it('makes shared stubs read the container share scope, and the host registry otherwise', async () => {
    const stub = await sharedStub('brick-module');
    const evaluate = (shareScope: unknown) => {
      const module = { exports: {} as Record<string, unknown> };
      new Function('module', 'globalThis', '__graniteShareScope', stub)(
        module,
        { __MICRO_FRONTEND__: { __SHARED__: { 'brick-module': { get: () => ({ owner: 'host' }) } } } },
        shareScope
      );
      return module.exports.owner;
    };
    expect(evaluate(undefined)).toBe('host');
    expect(evaluate({ get: (name: string) => ({ owner: `container:${name}` }) })).toBe('container:brick-module');
  });
});
