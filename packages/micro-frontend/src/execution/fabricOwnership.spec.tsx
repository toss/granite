import { runInNewContext } from 'node:vm';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { asyncToGenerator } from './asyncToGenerator';
import { getExecutionContext } from './context';
import { getExecutionSessions } from './sessions';
import { createFabricExecutionHarness } from '../../test/fabricExecutionHarness';
import { transformExecutionOwnership } from '../plugin-utils/executionTransform';
import { MicroFrontendSessionProvider } from '../session/MicroFrontendSessionContext';

// The production renderer must share the production React dispatcher and JSX runtime.
vi.mock('react', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  return require(require.resolve('react/package.json').replace(/package\.json$/, 'cjs/react.production.js'));
});
vi.mock('react/jsx-dev-runtime', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const runtime = require(require.resolve('react/package.json').replace(/package\.json$/, 'cjs/react-jsx-runtime.production.js'));
  return { ...runtime, jsxDEV: runtime.jsx };
});
vi.mock('@granite-js/react-native', () => ({ VisibilityChangedProvider: ({ children }: { children: React.ReactNode }) => children }));

describe('compiled Fabric execution ownership', () => {
  it('preserves delayed shared-helper ownership after another service opens and the first one unmounts', async () => {
    const host = createFabricExecutionHarness();
    const context = getExecutionContext();
    const sessions = getExecutionSessions();
    const tokenA = sessions.bind('delayed-a', 'delayed:a');
    const tokenB = sessions.bind('delayed-b', 'delayed:b');
    const gateA = Promise.withResolvers<void>();
    const gateB = Promise.withResolvers<void>();
    const transformed = transformExecutionOwnership('shared.js', `
      async function shared(gate) {
        await gate;
        await Promise.resolve();
        return nativeModule.identify();
      }
      globalThis.shared = shared;
    `);
    const shared: (gate: Promise<void>) => Promise<unknown> = runInNewContext(`${transformed?.code}\nglobalThis.shared;`, {
      require: () => ({ asyncToGenerator }),
      nativeModule: { identify: () => context.capture() },
    });
    const pending = new Map<string, Promise<unknown>>();
    function Screen({ origin, gate }: { origin: string; gate: Promise<void> }) {
      return React.createElement('View', { testID: origin, onPress: () => pending.set(origin, shared(gate)) });
    }
    const tree = (includeA: boolean, includeB: boolean) => <>
      {includeA && <MicroFrontendSessionProvider key="a" sessionId="delayed-a" presentationVisibility={!includeB}><Screen origin="a" gate={gateA.promise} /></MicroFrontendSessionProvider>}
      {includeB && <MicroFrontendSessionProvider key="b" sessionId="delayed-b" presentationVisibility={true}><Screen origin="b" gate={gateB.promise} /></MicroFrontendSessionProvider>}
    </>;
    try {
      await host.render(tree(true, false));
      await host.press('a');
      await host.render(tree(true, true));
      await host.press('b');
      gateB.resolve();
      expect(await pending.get('b')).toBe(tokenB);
      sessions.release('delayed-a', tokenA.id);
      await host.render(tree(false, true));
      gateA.resolve();
      expect(await pending.get('a')).toBe(tokenA);
      expect(context.capture()).toBeNull();
    } finally {
      await host.close();
      sessions.release('delayed-b', tokenB.id);
    }
  });

  it('assigns class lifecycles and ref cleanups to their own service in mixed commits', async () => {
    const host = createFabricExecutionHarness();
    const sessions = getExecutionSessions();
    const context = getExecutionContext();
    sessions.bind('class-a', 'class:a');
    sessions.bind('class-b', 'class:b');
    const calls: Array<{ origin: string; phase: string; owner: string | null }> = [];
    const record = (origin: string, phase: string) => calls.push({ origin, phase, owner: context.capture()?.id ?? null });
    class Screen extends React.Component<{ origin: string; revision: number }> {
      captureRef = (node: unknown) => {
        if (node != null) {
          record(this.props.origin, 'ref');
          return () => { record(this.props.origin, 'ref-cleanup'); };
        }
        return undefined;
      };
      componentDidMount() { record(this.props.origin, 'mount'); }
      componentDidUpdate() { record(this.props.origin, 'update'); }
      componentWillUnmount() { record(this.props.origin, 'unmount'); }
      getSnapshotBeforeUpdate() { record(this.props.origin, 'snapshot'); return null; }
      render() {
        record(this.props.origin, 'render');
        return React.createElement('View', { testID: this.props.origin, ref: this.captureRef });
      }
    }
    const tree = (includeA: boolean, revision: number) => <>
      {includeA && <MicroFrontendSessionProvider key="a" sessionId="class-a" presentationVisibility={false}><Screen origin="a" revision={revision} /></MicroFrontendSessionProvider>}
      <MicroFrontendSessionProvider key="b" sessionId="class-b" presentationVisibility={true}><Screen origin="b" revision={revision} /></MicroFrontendSessionProvider>
    </>;
    try {
      await host.render(tree(true, 0));
      await host.render(tree(true, 1));
      await host.render(tree(false, 1));
      for (const call of calls) {expect(call.owner, `${call.origin}:${call.phase}`).toBe(`class:${call.origin}`);}
      expect(calls.filter(({ origin }) => origin === 'a').map(({ phase }) => phase)).toEqual(expect.arrayContaining([
        'render', 'mount', 'snapshot', 'update', 'unmount', 'ref', 'ref-cleanup',
      ]));
      expect(context.capture()).toBeNull();
    } finally {
      await host.close();
      sessions.release('class-a', 'class:a');
      sessions.release('class-b', 'class:b');
    }
  });

  for (const instrumented of [true, false]) {
    it(`routes shared render, effect, event, and cleanup functions by their Fiber: instrumentation=${instrumented}`, async () => {
      const host = createFabricExecutionHarness(instrumented);
      const context = getExecutionContext();
      const sessions = getExecutionSessions();
      const prefix = instrumented ? 'fabric-owned' : 'fabric-control';
      sessions.bind(`${prefix}-a`, `${prefix}:a`);
      sessions.bind(`${prefix}-b`, `${prefix}:b`);
      const calls: Array<{ origin: string; phase: string; owner: string | null }> = [];
      const sharedNativeCall = (origin: string, phase: string) => calls.push({ origin, phase, owner: context.capture()?.id ?? null });
      function Screen({ origin }: { origin: string }) {
        sharedNativeCall(origin, 'render');
        React.useLayoutEffect(() => {
          sharedNativeCall(origin, 'layout');
          return () => { sharedNativeCall(origin, 'layout-cleanup'); };
        }, [origin]);
        React.useEffect(() => {
          sharedNativeCall(origin, 'effect');
          return () => { sharedNativeCall(origin, 'effect-cleanup'); };
        }, [origin]);
        return React.createElement('View', { testID: origin, onPress: () => sharedNativeCall(origin, 'event') });
      }
      const tree = (includeA: boolean) => <>
        {includeA && <MicroFrontendSessionProvider key="a" sessionId={`${prefix}-a`} presentationVisibility={false}><Screen origin="a" /></MicroFrontendSessionProvider>}
        <MicroFrontendSessionProvider key="b" sessionId={`${prefix}-b`} presentationVisibility={true}><Screen origin="b" /></MicroFrontendSessionProvider>
      </>;
      try {
        await host.render(tree(true));
        await host.press('a');
        await host.press('b');
        await host.render(tree(false));
        expect(calls.filter(({ origin }) => origin === 'a').map(({ phase }) => phase)).toEqual([
          'render', 'layout', 'effect', 'event', 'layout-cleanup', 'effect-cleanup',
        ]);
        for (const call of calls) {
          expect(call.owner, `${call.origin}:${call.phase}`).toBe(instrumented ? `${prefix}:${call.origin}` : null);
        }
        expect(context.capture()).toBeNull();
      } finally {
        await host.close();
        sessions.release(`${prefix}-a`, `${prefix}:a`);
        sessions.release(`${prefix}-b`, `${prefix}:b`);
      }
    });
  }
});
