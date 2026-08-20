import { writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { getMicroFrontendRuntimeContext, importModule, removeContainer } from './registry';
import { preCompatibilityRemoteBundle } from './registryCompatibilityFixture';
import { getPreludeConfig as getLegacyPreludeConfig } from '../../../plugin-micro-frontend/src/prelude';
import { virtualSharedConfig } from '../../../plugin-micro-frontend/src/resolver';
import {
  createContainer as createLegacyContainer,
  exposeModule as exposeLegacyModule,
  registerShared as registerLegacyShared,
} from '../../../plugin-micro-frontend/src/runtime';
import { importRemoteModule as importLegacyModule } from '../../../plugin-micro-frontend/src/runtime/utils';
import { getPreludeConfig as getCompatiblePreludeConfig } from '../plugin/prelude';

type MatrixObservation = {
  readonly cell: string;
  readonly status: 'passed';
  readonly reason: string;
};

type PositiveCell = {
  readonly name: string;
  readonly appName: string;
  readonly host: 'legacy' | 'compatible';
  readonly legacyAppIsUnsupported?: true;
  readonly setup: (moduleValue: object, sharedValue: object) => void;
};

const observations: MatrixObservation[] = [];
const legacyRuntimeImport =
  "import { registerShared, createContainer, exposeModule } from '@granite-js/plugin-micro-frontend/runtime';";

function clearMicroFrontendGlobals(): void {
  Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
}

function runInVm(source: string, bindings: Readonly<Record<string, unknown>> = {}): void {
  vm.runInNewContext(source, { global: globalThis, ...bindings });
}

function executeLegacyRemote(appName: string, moduleValue: object, sharedValue: object): void {
  const config = getLegacyPreludeConfig({ name: appName });
  const linkedPrelude = config.preludeScript.replace(
    legacyRuntimeImport,
    'const { registerShared, createContainer, exposeModule } = legacyRuntime;'
  );
  if (linkedPrelude === config.preludeScript) {
    throw new Error('Legacy prelude import was not linked to its actual runtime exports');
  }
  runInVm(
    [
      config.banner,
      linkedPrelude,
      'exposeModule(__container, "./App", moduleValue);',
      'registerShared("shared", sharedValue);',
    ].join('\n'),
    {
      legacyRuntime: {
        createContainer: createLegacyContainer,
        exposeModule: exposeLegacyModule,
        registerShared: registerLegacyShared,
      },
      moduleValue,
      sharedValue,
    }
  );
}

function executeCompatibleRemote(appName: string, moduleValue: object, sharedValue: object): void {
  const config = getCompatiblePreludeConfig({}, appName);
  runInVm(
    [
      config.banner,
      config.preludeScript,
      'exposeModule(__container, "./App", moduleValue);',
      'registerShared("shared", sharedValue);',
    ].join('\n'),
    { moduleValue, sharedValue }
  );
}

function executePreCompatibilityRemote(appName: string, moduleValue: object, sharedValue: object): void {
  runInVm(
    [
      preCompatibilityRemoteBundle,
      `const __container = createContainer(${JSON.stringify(appName)}, {});`,
      'exposeModule(__container, "./App", moduleValue);',
      'registerShared("shared", sharedValue);',
    ].join('\n'),
    { moduleValue, sharedValue }
  );
}

async function importLegacyShared(): Promise<unknown> {
  const config = virtualSharedConfig([['shared', {}]]);
  const load = config.protocols?.['virtual-shared']?.load;
  if (load == null) {
    throw new Error('Legacy shared resolver did not provide an executable loader');
  }
  const result = await load({
    path: 'shared',
    namespace: 'virtual-shared',
    suffix: '',
    pluginData: undefined,
    with: {},
  });
  if (typeof result.contents !== 'string') {
    throw new Error('Legacy shared resolver did not generate JavaScript');
  }
  const module: { exports: unknown } = { exports: undefined };
  runInVm(result.contents, { module });
  return module.exports;
}

function importCompatibleShared(): unknown {
  const entry = getMicroFrontendRuntimeContext().sharedModules.shared;
  if (entry == null) {
    throw new Error('Compatible shared registry did not contain the remote module');
  }
  return entry.get();
}

function record(cell: string, reason: string): void {
  observations.push({ cell, status: 'passed', reason });
}

const positiveCells: readonly PositiveCell[] = [
  {
    name: 'legacy-host/legacy-remote remote-first',
    appName: 'legacy-legacy',
    host: 'legacy',
    setup: (moduleValue, sharedValue) => executeLegacyRemote('legacy-legacy', moduleValue, sharedValue),
  },
  {
    name: 'compatible-host/compatible-remote host-first',
    appName: 'compatible-compatible',
    host: 'compatible',
    setup: (moduleValue, sharedValue) => {
      getMicroFrontendRuntimeContext();
      executeCompatibleRemote('compatible-compatible', moduleValue, sharedValue);
    },
  },
  {
    name: 'compatible-host/legacy-remote host-first',
    appName: 'compatible-legacy',
    host: 'compatible',
    setup: (moduleValue, sharedValue) => {
      getMicroFrontendRuntimeContext();
      executeLegacyRemote('compatible-legacy', moduleValue, sharedValue);
    },
  },
  {
    name: 'legacy-host/compatible-remote remote-first',
    appName: 'legacy-compatible',
    host: 'legacy',
    setup: (moduleValue, sharedValue) => executeCompatibleRemote('legacy-compatible', moduleValue, sharedValue),
  },
  {
    name: 'compatible-host/pre-compat-remote through _granite adapter',
    appName: 'compatible-pre-compat',
    host: 'compatible',
    legacyAppIsUnsupported: true,
    setup: (moduleValue, sharedValue) => {
      executePreCompatibilityRemote('compatible-pre-compat', moduleValue, sharedValue);
      getMicroFrontendRuntimeContext();
    },
  },
];

afterEach(clearMicroFrontendGlobals);

afterAll(() => {
  const evidencePath = process.env.MICRO_FRONTEND_COMPATIBILITY_EVIDENCE_PATH;
  if (evidencePath != null) {
    writeFileSync(evidencePath, `${JSON.stringify({ cells: observations }, null, 2)}\n`);
  }
});

describe('cross-version registry compatibility matrix', () => {
  it.each(positiveCells)('$name preserves app and shared traffic at the same remote name', async (cell) => {
    // Given
    const moduleValue = { cell: cell.name };
    const sharedValue = { cell: `${cell.name}:shared` };
    cell.setup(moduleValue, sharedValue);

    // When
    const hostApp =
      cell.host === 'legacy' ? importLegacyModule(`${cell.appName}/App`) : importModule(`${cell.appName}/App`);
    const hostShared = cell.host === 'legacy' ? await importLegacyShared() : importCompatibleShared();
    const compatibleApp = importModule(`${cell.appName}/App`);
    const compatibleShared = importCompatibleShared();

    // Then
    expect(Reflect.get(hostApp, 'default') ?? hostApp).toBe(moduleValue);
    expect(hostShared).toBe(sharedValue);
    expect(compatibleApp).toBe(moduleValue);
    expect(compatibleShared).toBe(sharedValue);
    if (cell.legacyAppIsUnsupported) {
      expect(() => importLegacyModule(`${cell.appName}/App`)).toThrow(`${cell.appName} container not found`);
    } else {
      const legacyApp = importLegacyModule(`${cell.appName}/App`);
      expect(Reflect.get(legacyApp, 'default') ?? legacyApp).toBe(moduleValue);
    }
    expect(await importLegacyShared()).toBe(sharedValue);
    record(cell.name, 'both host registries observe the remote-owned app and shared module at one name');
  });

  it('removes compatible-owned hybrid state from both registry views and permits a fresh same-name remote', () => {
    // Given
    const firstModule = { version: 'first' };
    const sharedValue = { version: 'shared' };
    executeCompatibleRemote('owned-remote', firstModule, sharedValue);
    const legacyContainer = importLegacyModule('owned-remote/App');

    // When
    removeContainer('owned-remote');
    const replacementModule = { version: 'replacement' };
    executeCompatibleRemote('owned-remote', replacementModule, sharedValue);

    // Then
    expect(Reflect.get(legacyContainer, 'default')).toBe(firstModule);
    expect(importModule('owned-remote/App')).toBe(replacementModule);
    expect(Reflect.get(importLegacyModule('owned-remote/App'), 'default')).toBe(replacementModule);
    expect(importCompatibleShared()).toBe(sharedValue);
    record(
      'compatible-owned removal',
      'removeContainer clears paired container views while preserving process-owned shared state'
    );
  });

  it('removes pre-compat remote state after the _granite adapter adopts its owner registry', () => {
    // Given
    const moduleValue = { version: 'pre-compat' };
    executePreCompatibilityRemote('pre-compat-owned', moduleValue, { version: 'shared' });
    getMicroFrontendRuntimeContext();

    // When
    removeContainer('pre-compat-owned');

    // Then
    expect(() => importModule('pre-compat-owned/App')).toThrow(
      "Could not resolve './App' from app container 'pre-compat-owned'"
    );
    expect(Reflect.has(getMicroFrontendRuntimeContext().containers, 'pre-compat-owned')).toBe(false);
    record('pre-compat removal', '_granite adapter retains ownership of adopted modern container removal');
  });

  it('rejects an old host and an already-built pre-compat remote without compatibility bootstrap', () => {
    // Given
    executeLegacyRemote('legacy-host', { version: 'host' }, { version: 'host-shared' });
    executePreCompatibilityRemote('pre-compat-remote', { version: 'remote' }, { version: 'remote-shared' });

    // When
    const importFromLegacyHost = () => importLegacyModule('pre-compat-remote/App');

    // Then
    expect(importFromLegacyHost).toThrow('pre-compat-remote container not found');
    expect(Reflect.has(globalThis.__MICRO_FRONTEND__.__INSTANCES__, 'pre-compat-remote')).toBe(false);
    record(
      'old-host/pre-compat-remote without bootstrap',
      'unsupported: the old host reads __MICRO_FRONTEND__, while the remote writes only _graniteMicroFrontend'
    );
  });

  it('rejects a product-specific app-name mismatch instead of routing to another remote', () => {
    // Given
    executeCompatibleRemote('catalog', { product: 'catalog' }, { version: 'shared' });

    // When
    const importCart = () => importModule('cart/App');

    // Then
    expect(importCart).toThrow("Could not resolve './App' from app container 'cart'");
    expect(importModule<{ readonly product: string }>('catalog/App')).toEqual({ product: 'catalog' });
    record('name mismatch', 'unsupported: app names are registry identities and are never product-routed aliases');
  });

  it('rejects a missing exposed module and a stale malformed legacy name entry', () => {
    // Given
    executeCompatibleRemote('missing-module', { version: 'app' }, { version: 'shared' });
    Reflect.defineProperty(globalThis.__MICRO_FRONTEND__.__INSTANCES__, 'malformed', { configurable: true, value: 99 });

    // When
    const importMissing = () => importModule('missing-module/Other');
    const registerMalformed = () =>
      executeCompatibleRemote('malformed', { version: 'malformed' }, { version: 'shared' });

    // Then
    expect(importMissing).toThrow("Could not resolve './Other' from app container 'missing-module'");
    expect(registerMalformed).toThrow("App container 'malformed' is already registered");
    record(
      'missing module and malformed stale state',
      'unsupported: absent exposes and occupied legacy name slots cannot be resolved safely'
    );
  });
});
