import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as execution from '../src/execution/renderer';
import { transformRendererExecution } from '../src/plugin-utils/rendererExecutionTransform';

interface NativeNode {
  readonly tag: number;
  readonly handle: unknown;
  readonly props: Record<string, unknown>;
  readonly children: NativeNode[];
}
interface Renderer {
  render(element: React.ReactNode, tag: number, callback: null, concurrent: boolean, options: {
    onUncaughtError(error: unknown): void;
    onCaughtError(error: unknown): void;
  }): unknown;
  stopSurface(tag: number): void;
}
interface Scheduler {
  unstable_flushAllWithoutAsserting(): boolean;
  unstable_hasPendingWork(): boolean;
}
type EventHandler = (handle: unknown, name: string, event: Record<string, unknown>) => void;

/** Executes the real production Fabric renderer; only the native UI host is a test double. */
export function createFabricExecutionHarness(instrumented = true) {
  const require = createRequire(import.meta.url);
  const manifest = require.resolve('react-native/package.json');
  const nativeRequire = createRequire(manifest);
  const scheduler = nativeRequire('scheduler/unstable_mock') as Scheduler;
  const filename = path.join(path.dirname(manifest), 'Libraries/Renderer/implementations/ReactFabric-prod.js');
  const source = readFileSync(filename, 'utf8');
  const code = instrumented ? transformRendererExecution(filename, source)?.code : source;
  if (code == null) {throw new Error('Renderer compilation produced no code');}
  const microtasks: Array<() => void> = [];
  const errors: unknown[] = [];
  const caughtErrors: unknown[] = [];
  const roots = new Map<number, NativeNode[]>();
  let eventHandler: EventHandler | undefined;
  const directEvents = { topPress: { registrationName: 'onPress' } };
  const viewConfig = { uiViewClassName: 'View', validAttributes: { testID: true }, directEventTypes: directEvents };
  const host = {
    createNode(tag: number, _type: string, _root: number, props: Record<string, unknown>, handle: unknown): NativeNode {
      return { tag, props, handle, children: [] };
    },
    cloneNodeWithNewChildren(node: NativeNode): NativeNode { return { ...node, children: [] }; },
    cloneNodeWithNewProps(node: NativeNode, props: Record<string, unknown>): NativeNode { return { ...node, props }; },
    cloneNodeWithNewChildrenAndProps(node: NativeNode, props: Record<string, unknown>): NativeNode {
      return { ...node, props, children: [] };
    },
    createChildSet: () => [] as NativeNode[],
    appendChild: (parent: NativeNode, child: NativeNode) => parent.children.push(child),
    appendChildToSet: (set: NativeNode[], child: NativeNode) => set.push(child),
    completeRoot: (tag: number, children: NativeNode[]) => roots.set(tag, children),
    registerEventHandler: (handler: EventHandler) => { eventHandler = handler; },
    unstable_getCurrentEventPriority: () => null,
    setIsJSResponder: () => {},
  };
  const privateInterface = {
    ReactNativeViewConfigRegistry: { get: () => viewConfig, customBubblingEventTypes: {}, customDirectEventTypes: directEvents },
    RawEventEmitter: { emit: () => {} },
    createAttributePayload: (props: Record<string, unknown>) => props,
    diffAttributePayloads: (_previous: unknown, props: Record<string, unknown>) => props,
    createPublicInstance: (tag: number) => ({ _nativeTag: tag }),
    createPublicRootInstance: (tag: number) => ({ _nativeTag: tag }),
    ReactFiberErrorDialog: { showErrorDialog: ({ error }: { error: unknown }) => { errors.push(error); return false; } },
  };
  const module = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require(name: string) {
      if (name === 'react') {return React;}
      if (name === 'scheduler') {return scheduler;}
      if (name === '@granite-js/micro-frontend/execution/renderer') {return execution;}
      if (name.endsWith('/ReactNativePrivateInitializeCore')) {return {};}
      if (name.endsWith('/ReactNativePrivateInterface')) {return privateInterface;}
      throw new Error(`Unexpected renderer dependency: ${name}`);
    },
    nativeFabricUIManager: host,
    RN$enableMicrotasksInReact: true,
    queueMicrotask: (callback: () => void) => microtasks.push(callback),
    setTimeout,
    clearTimeout,
    console,
    performance,
    reportError: (error: unknown) => errors.push(error),
  }, { filename });
  const renderer = module.exports as Renderer;

  async function flush(): Promise<void> {
    for (let turn = 0; turn < 20; turn++) {
      while (microtasks.length > 0) {microtasks.shift()?.();}
      scheduler.unstable_flushAllWithoutAsserting();
      await Promise.resolve();
      if (errors.length > 0) {throw errors[0];}
      if (!scheduler.unstable_hasPendingWork() && microtasks.length === 0) {
        await Promise.resolve();
        if (!scheduler.unstable_hasPendingWork() && microtasks.length === 0) {return;}
      }
    }
    throw new Error('Fabric work did not settle');
  }

  return {
    async render(element: React.ReactNode) {
      renderer.render(element, 1, null, true, {
        onUncaughtError: (error) => { errors.push(error); },
        onCaughtError: (error) => { caughtErrors.push(error); },
      });
      await flush();
    },
    async press(testID: string) {
      function find(nodes: NativeNode[]): NativeNode | undefined {
        for (const node of nodes) {
          if (node.props.testID === testID) {return node;}
          const child = find(node.children);
          if (child != null) {return child;}
        }
        return undefined;
      }
      const node = find(roots.get(1) ?? []);
      if (node == null || eventHandler == null) {throw new Error(`Missing committed event target: ${testID}`);}
      eventHandler(node.handle, 'topPress', { target: node.tag });
      await flush();
    },
    async close() { renderer.stopSurface(1); await flush(); },
    flush,
    caughtErrors,
  };
}
