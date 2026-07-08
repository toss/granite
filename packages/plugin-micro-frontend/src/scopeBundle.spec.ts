import { describe, expect, it } from 'vitest';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { scopeBundleSource, scopeMicroFrontendBundle } from './scopeBundle';

type RemoteEntry = (
  globalOverride?: Record<string, unknown>,
  globalThisOverride?: Record<string, unknown>,
  windowOverride?: Record<string, unknown>,
  selfOverride?: Record<string, unknown>
) => void;

type HostGlobal = {
  readonly name: string;
  readonly calls: string[];
  __GRANITE_MICRO_FRONTEND_ENTRIES__?: Record<string, RemoteEntry>;
  __GRANITE_MICRO_FRONTEND_SCOPES__?: Record<string, TestRuntimeContext>;
};

type RegistryHostGlobal = {
  __GRANITE_MICRO_FRONTEND_ENTRIES__?: Record<string, RemoteEntry>;
  __GRANITE_MICRO_FRONTEND_SCOPES__?: Record<string, TestRuntimeContext>;
};

type TestContainer = {
  readonly name: string;
  readonly exposeMap: Record<string, unknown>;
};

type TestRuntimeContext = {
  readonly __INSTANCES__: TestContainer[] & Record<string, number>;
  readonly __SHARED__: Record<string, unknown>;
};

type SharedRegistryHostGlobal = RegistryHostGlobal & {
  readonly __MICRO_FRONTEND__: {
    readonly __INSTANCES__: unknown[];
    readonly __SHARED__: {
      readonly react: {
        readonly get: () => string;
      };
    };
  };
};

const ENTRY_FUNCTION_PATTERN = /__graniteMicroFrontendRemoteEntry_service_app_remote_app_[0-9a-z]+/;
const FACTORY_FUNCTION_PATTERN = /__graniteMicroFrontendRemoteFactory_service_app_remote_app_[0-9a-z]+/;

describe('scopeBundleSource', () => {
  it('wraps the esbuild IIFE body with scoped global aliases', () => {
    const source = `var global = hostGlobal;
(function() {
  global.remoteValue = "scoped";
  if (global !== globalThis || global !== window || global !== self) throw new Error("aliases are not scoped");
  if (global.__MICRO_FRONTEND__.__SHARED__.react.get() !== "host-react") throw new Error("host shared fallback failed");
  global.__MICRO_FRONTEND__.__SHARED__.local = { get: function() { return "local"; } };
})();
//# sourceMappingURL=bundle.js.map`;
    const hostGlobal: SharedRegistryHostGlobal = {
      __MICRO_FRONTEND__: {
        __INSTANCES__: Object.assign([], {}),
        __SHARED__: {
          react: {
            get: () => 'host-react',
          },
        },
      },
    };

    new Function('hostGlobal', scopeBundleSource(source))(hostGlobal);
    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.app?.();

    expect('remoteValue' in hostGlobal).toBe(false);
    expect('local' in hostGlobal.__MICRO_FRONTEND__.__SHARED__).toBe(false);
  });

  it('throws when the bundle is not an esbuild IIFE output', () => {
    expect(() => scopeBundleSource('console.log("not iife");')).toThrow(
      'Micro frontend bundle must be an esbuild IIFE output'
    );
  });

  it('creates an isolated registry when the host does not have a shared registry', () => {
    const source = `var global = hostGlobal;
(function() {
  global.__MICRO_FRONTEND__.__SHARED__.local = { get: function() { return "local"; } };
})();
`;
    const hostGlobal: RegistryHostGlobal = {};

    new Function('hostGlobal', scopeBundleSource(source))(hostGlobal);
    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.app?.();

    expect('__MICRO_FRONTEND__' in hostGlobal).toBe(false);
  });

  it('registers a top-level named callable entry without running the service body at bundle evaluation time', () => {
    const source = `var global = hostGlobal;
(function() {
  global.calls.push([global.name, globalThis.name, window.name, self.name].join("/"));
})();
`;
    const hostGlobal: HostGlobal = {
      name: 'host',
      calls: [],
    };
    const scopedSource = scopeBundleSource(source, { appName: 'service-app', name: 'remote-app' });

    new Function('hostGlobal', scopedSource)(hostGlobal);

    const entry = hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.['service-app'];
    expect(entry?.name).toMatch(ENTRY_FUNCTION_PATTERN);
    expect(scopedSource).toMatch(
      /^var global = hostGlobal;\nfunction __graniteMicroFrontendRemoteEntry_service_app_remote_app_[0-9a-z]+/
    );
    expect(scopedSource).toMatch(FACTORY_FUNCTION_PATTERN);
    expect(scopedSource).not.toContain('(function() {\n  var __graniteMicroFrontendHostGlobal = global;');
    expect(hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.['remote-app']).toBeUndefined();
    expect(hostGlobal.calls).toEqual([]);

    entry?.();
    entry?.({ name: 'global', calls: hostGlobal.calls }, { name: 'globalThis' }, { name: 'window' }, { name: 'self' });
    entry?.();

    expect(hostGlobal.calls).toEqual(['host/host/host/host', 'global/globalThis/window/self', 'host/host/host/host']);
  });

  it('retains separate appName scopes for remotes that use the same container name', () => {
    const hostGlobal: HostGlobal & {
      readonly __MICRO_FRONTEND__: TestRuntimeContext;
    } = {
      name: 'host',
      calls: [],
      __MICRO_FRONTEND__: createTestRuntimeContext(),
    };
    const showcaseSource = scopeBundleSource(createRemoteContainerSource('showcase-screen'), {
      appName: 'showcase',
      name: 'remoteApp',
    });
    const counterSource = scopeBundleSource(createRemoteContainerSource('counter-screen'), {
      appName: 'counter',
      name: 'remoteApp',
    });

    new Function('hostGlobal', showcaseSource)(hostGlobal);
    new Function('hostGlobal', counterSource)(hostGlobal);

    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.showcase?.();
    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.counter?.();

    const showcaseContext = hostGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.showcase;
    const counterContext = hostGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.counter;

    expect(showcaseContext).toBeDefined();
    expect(counterContext).toBeDefined();
    expect(showcaseContext).not.toBe(counterContext);
    expect(getTestContainer(hostGlobal.__MICRO_FRONTEND__, 'remoteApp')).toBe(null);
    expect(getTestContainer(showcaseContext, 'remoteApp')?.exposeMap.AppContainer).toBe('showcase-screen');
    expect(getTestContainer(counterContext, 'remoteApp')?.exposeMap.AppContainer).toBe('counter-screen');
  });

  it('supports minified esbuild IIFE output', () => {
    const source = `var global=hostGlobal;(function(){global.calls.push([global.name,globalThis.name,window.name,self.name].join("/"))})();`;
    const hostGlobal: HostGlobal = {
      name: 'host',
      calls: [],
    };
    const scopedSource = scopeBundleSource(source);

    new Function('hostGlobal', scopedSource)(hostGlobal);
    expect(hostGlobal.calls).toEqual([]);

    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.app?.();

    expect(hostGlobal.calls).toEqual(['host/host/host/host']);
  });

  it('keeps banner IIFEs outside of the remote entry body', () => {
    const source = `var global=hostGlobal;
(function(){
  global.bannerRan=true;
  global.bannerPadding="${'x'.repeat(300)}";
})();
(function(){global.calls.push("remote")})();`;
    const hostGlobal: HostGlobal & { bannerRan?: boolean } = {
      name: 'host',
      calls: [],
    };
    const scopedSource = scopeBundleSource(source);

    new Function('hostGlobal', scopedSource)(hostGlobal);

    expect(hostGlobal.bannerRan).toBe(true);
    expect(hostGlobal.calls).toEqual([]);

    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.app?.();

    expect(hostGlobal.calls).toEqual(['remote']);
  });

  it('keeps nested IIFEs inside the remote entry body', () => {
    const source = `var global=hostGlobal;
(function(){
  (function(){global.calls.push("nested")})();
  global.calls.push("remote");
})();`;
    const hostGlobal: HostGlobal = {
      name: 'host',
      calls: [],
    };
    const scopedSource = scopeBundleSource(source);

    new Function('hostGlobal', scopedSource)(hostGlobal);

    expect(hostGlobal.calls).toEqual([]);

    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.app?.();

    expect(hostGlobal.calls).toEqual(['nested', 'remote']);
  });

  it('supports regex literals with braces inside the remote entry body', () => {
    const source = `var global=hostGlobal;
(function(){
  var re=/}/;
  global.calls.push(re.source);
})();`;
    const hostGlobal: HostGlobal = {
      name: 'host',
      calls: [],
    };
    const scopedSource = scopeBundleSource(source);

    new Function('hostGlobal', scopedSource)(hostGlobal);

    expect(hostGlobal.calls).toEqual([]);

    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.app?.();

    expect(hostGlobal.calls).toEqual(['}']);
  });

  it('moves sourcemap generated positions to the transformed remote entry body', async () => {
    const source = `var global=hostGlobal;
(function(){
  global.calls.push("remote");
})();`;
    const originalSource = 'src/remote.tsx';
    const sourcemap = new SourceMapGenerator({ file: 'bundle.js' });
    sourcemap.addMapping({
      generated: getPosition(source, source.indexOf('global.calls.push')),
      original: {
        line: 10,
        column: 4,
      },
      source: originalSource,
    });
    sourcemap.setSourceContent(originalSource, 'global.calls.push("remote");');
    const sourcemapJSON = JSON.parse(sourcemap.toString());
    sourcemapJSON.x_google_ignoreList = [1];

    const bundle = await scopeMicroFrontendBundle({
      source: createOutputFile('bundle.js', source),
      sourcemap: createOutputFile('bundle.js.map', JSON.stringify(sourcemapJSON)),
    });
    const generatedPosition = getPosition(bundle.source.text, bundle.source.text.indexOf('global.calls.push'));
    const consumer = await new SourceMapConsumer(bundle.sourcemap.text);

    try {
      expect(consumer.originalPositionFor(generatedPosition)).toMatchObject({
        source: originalSource,
        line: 10,
        column: 4,
      });
      expect(consumer.sourceContentFor(originalSource)).toBe('global.calls.push("remote");');
      expect(JSON.parse(bundle.sourcemap.text).x_google_ignoreList).toEqual([1]);
    } finally {
      consumer.destroy();
    }
  });

  it('seeds a dispose hook array on the published scope context', () => {
    const source = `var global = hostGlobal;
(function() {
  global.__MICRO_FRONTEND__.__DISPOSE__.push(function() {});
})();
`;
    const hostGlobal: RegistryHostGlobal = {};

    new Function('hostGlobal', scopeBundleSource(source))(hostGlobal);
    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.app?.();

    const context = hostGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.app as { __DISPOSE__?: unknown[] } | undefined;
    expect(Array.isArray(context?.__DISPOSE__)).toBe(true);
    // the service-pushed hook plus the built-in hooks (entry-locals cleanup,
    // scope-owned timer cleanup)
    expect(context?.__DISPOSE__).toHaveLength(3);
  });

  it('marks the scoped runtime and keeps __granite writes scope-local', () => {
    const source = `var global = hostGlobal;
(function() {
  global.calls.push(String(globalThis.__GRANITE_MICRO_FRONTEND_SCOPED__ === true));
  global.__granite = global.__granite || {};
  global.__granite.app = { name: "remote-service" };
  global.calls.push(global.__granite.app.name + "/" + global.__granite.meta.env.SHARED);
})();
`;
    const hostGlobal: HostGlobal & {
      __granite?: { app?: { name: string }; meta?: { env: { SHARED: string } } };
      __GRANITE_MICRO_FRONTEND_SCOPED__?: boolean;
    } = {
      name: 'host',
      calls: [],
      __granite: { app: { name: 'host-app' }, meta: { env: { SHARED: 'host-env' } } },
    };

    new Function('hostGlobal', scopeBundleSource(source))(hostGlobal);
    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.app?.();

    // Inside the scope: marker visible, own `.app` write shadows the host's,
    // untouched keys (meta.env) remain readable through the prototype chain.
    expect(hostGlobal.calls).toEqual(['true', 'remote-service/host-env']);
    expect(hostGlobal.__GRANITE_MICRO_FRONTEND_SCOPED__).toBeUndefined();
    expect(hostGlobal.__granite?.app?.name).toBe('host-app');
  });

  it('keeps global writes invisible across sibling scopes and the host', () => {
    const createProbeSource = (appName: string) => `var global = hostGlobal;
(function() {
  global.calls.push(${JSON.stringify(appName)} + "/before/" + String(global.__ISOLATION_PROBE__));
  global.__ISOLATION_PROBE__ = ${JSON.stringify(appName)};
  global.calls.push(${JSON.stringify(appName)} + "/after/" + String(global.__ISOLATION_PROBE__));
})();
`;
    const hostGlobal: HostGlobal = {
      name: 'host',
      calls: [],
    };

    new Function(
      'hostGlobal',
      scopeBundleSource(createProbeSource('service-a'), { appName: 'service-a', name: 'remoteApp' })
    )(hostGlobal);
    new Function(
      'hostGlobal',
      scopeBundleSource(createProbeSource('service-b'), { appName: 'service-b', name: 'remoteApp' })
    )(hostGlobal);
    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.['service-a']?.();
    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.['service-b']?.();

    expect(hostGlobal.calls).toEqual([
      'service-a/before/undefined',
      'service-a/after/service-a',
      'service-b/before/undefined',
      'service-b/after/service-b',
    ]);
    expect('__ISOLATION_PROBE__' in hostGlobal).toBe(false);
  });

  it('runs the service body in strict mode so bare assignments cannot escape to the host global', () => {
    const source = `var global = hostGlobal;
(function() {
  try {
    // Bare assignment to an undeclared binding — a strict-mode ReferenceError,
    // otherwise a silent leak to the real global.
    bareEscapeForSpecPurposes = 'leaked';
    global.calls.push('no-throw');
  } catch (error) {
    global.calls.push(error instanceof ReferenceError ? 'ReferenceError' : 'other');
  }
})();
`;
    const hostGlobal: HostGlobal & { bareEscapeForSpecPurposes?: string } = {
      name: 'host',
      calls: [],
    };

    new Function('hostGlobal', scopeBundleSource(source, { appName: 'service-app', name: 'remoteApp' }))(hostGlobal);
    hostGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.['service-app']?.();

    expect(hostGlobal.calls).toEqual(['ReferenceError']);
    expect('bareEscapeForSpecPurposes' in hostGlobal).toBe(false);
  });

  it('keeps generated entry names unique when service names sanitize to the same identifier', () => {
    const source = `var global = hostGlobal;
(function() {
})();
`;
    const dashedEntryName = scopeBundleSource(source, { appName: 'service-app', name: 'remote-app' }).match(
      /function (__graniteMicroFrontendRemoteEntry_[0-9A-Za-z_$]+)\(/
    )?.[1];
    const underscoredEntryName = scopeBundleSource(source, { appName: 'service-app', name: 'remote_app' }).match(
      /function (__graniteMicroFrontendRemoteEntry_[0-9A-Za-z_$]+)\(/
    )?.[1];

    expect(dashedEntryName).toBeDefined();
    expect(underscoredEntryName).toBeDefined();
    expect(dashedEntryName).not.toBe(underscoredEntryName);
  });
});

function createOutputFile(path: string, text: string) {
  let contents: Uint8Array = Buffer.from(text);

  return {
    path,
    get contents() {
      return contents;
    },
    set contents(value: Uint8Array) {
      contents = value;
    },
    hash: '',
    get text() {
      return Buffer.from(contents).toString('utf-8');
    },
  };
}

function createRemoteContainerSource(screenName: string) {
  return `var global = hostGlobal;
(function() {
  function createRuntimeContext() {
    return {
      __INSTANCES__: Object.assign([], {}),
      __SHARED__: {}
    };
  }
  function getDefaultRuntimeContext() {
    if (global.__MICRO_FRONTEND__ == null) global.__MICRO_FRONTEND__ = createRuntimeContext();
    return global.__MICRO_FRONTEND__;
  }
  function createContainer(name) {
    var context = getDefaultRuntimeContext();
    if (typeof context.__INSTANCES__[name] === "number") throw new Error("duplicate container");
    var container = {
      name: name,
      exposeMap: {
        AppContainer: "${screenName}"
      }
    };
    Object.defineProperty(context.__INSTANCES__, name, {
      value: context.__INSTANCES__.length
    });
    context.__INSTANCES__.push(container);
  }
  createContainer("remoteApp");
})();
`;
}

function createTestRuntimeContext(): TestRuntimeContext {
  return {
    __INSTANCES__: Object.assign<[], Record<string, number>>([], {}),
    __SHARED__: {},
  };
}

function getTestContainer(context: TestRuntimeContext | undefined, name: string) {
  const containerIndex = context?.__INSTANCES__[name];

  return typeof containerIndex === 'number' ? (context?.__INSTANCES__[containerIndex] ?? null) : null;
}

function getPosition(source: string, index: number) {
  const linesBeforeIndex = source.slice(0, index).split('\n');
  const lastLine = linesBeforeIndex[linesBeforeIndex.length - 1] ?? '';

  return {
    line: linesBeforeIndex.length,
    column: lastLine.length,
  };
}
