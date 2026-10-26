import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { transformExecutionOwnership } from './executionTransform';
import * as executionHelpers from '../execution';
import { createAsyncToGenerator } from '../execution/asyncToGenerator';
import { createExecutionContext, getExecutionContext } from '../execution/context';

describe('execution ownership compiler', () => {
  it('keeps two callers of unchanged async source separate through the generated helper', async () => {
    const source = `
      async function shared(gate) {
        await gate;
        await Promise.resolve();
        return nativeModule.identify();
      }
      globalThis.invoke = shared;
    `;
    const transformed = transformExecutionOwnership('shared.js', source);
    expect(transformed?.code).toBeTruthy();
    expect(transformed?.map).toBeTruthy();
    const context = createExecutionContext();
    const sandbox = {
      require(name: string) {
        if (name !== '@granite-js/micro-frontend/execution') {throw new Error(`Unexpected dependency: ${name}`);}
        return { asyncToGenerator: createAsyncToGenerator(context) };
      },
      nativeModule: { identify: () => context.capture() },
    };
    const invoke: (gate: Promise<unknown>) => Promise<unknown> = runInNewContext(
      `${transformed?.code ?? ''}\nglobalThis.invoke;`, sandbox
    );
    const gateA = Promise.withResolvers<void>();
    const gateB = Promise.withResolvers<void>();
    const tokenA = { id: 'a:1' };
    const tokenB = { id: 'b:1' };
    const first = context.run(tokenA, () => invoke(gateA.promise));
    const second = context.run(tokenB, () => invoke(gateB.promise));
    gateB.resolve();
    expect(await second).toBe(tokenB);
    gateA.resolve();
    expect(await first).toBe(tokenA);
    expect(context.capture()).toBeNull();
  });

  it('does not rewrite synchronous code or async words in comments', () => {
    expect(transformExecutionOwnership('sync.js', 'function call() { return nativeModule.identify(); }')).toBeNull();
    expect(transformExecutionOwnership('sync.js', '// async await\nconst value = 1;')).toBeNull();
  });

  it('leaves non-source assets to their own loaders', () => {
    expect(transformExecutionOwnership('metadata.json', '{"description":"async function"}')).toBeNull();
    expect(transformExecutionOwnership('icon.svg', '<svg>await</svg>')).toBeNull();
  });

  it('fails explicitly for continuations whose ownership is not implemented', () => {
    expect(() => transformExecutionOwnership('module.ts', 'export const result = await load();')).toThrow(
      'top-level await'
    );
  });
});

function compileGeneratorFixture(source: string) {
  const context = getExecutionContext();
  const calls: Array<string | null> = [];
  const result = transformExecutionOwnership('fixture.js', source);
  const sandbox = {
    require(name: string) {
      if (name !== '@granite-js/micro-frontend/execution') {throw new Error(`Unexpected helper ${name}`);}
      return executionHelpers;
    },
    identify() { const owner = context.capture()?.id ?? null; calls.push(owner); return owner; },
  };
  return { context, calls, evaluate: () => runInNewContext(result?.code ?? '', sandbox) };
}

it('preserves each queued async-generator request rather than the preceding caller', async () => {
  const fixture = compileGeneratorFixture(`
    async function* values(gate) {
      await gate;
      yield identify();
      await Promise.resolve();
      yield identify();
    }
    values;
  `);
  const values: (gate: Promise<void>) => AsyncGenerator<string> = fixture.evaluate();
  const gate = Promise.withResolvers<void>();
  const iterator = values(gate.promise);
  const a = fixture.context.run({ id: 'iterator:a' }, () => iterator.next());
  const b = fixture.context.run({ id: 'iterator:b' }, () => iterator.next());
  gate.resolve();
  expect(await a).toEqual({ value: 'iterator:a', done: false });
  expect(await b).toEqual({ value: 'iterator:b', done: false });
  expect(fixture.calls).toEqual(['iterator:a', 'iterator:b']);
  expect(fixture.context.capture()).toBeNull();
});

it('keeps for-await body and early iterator cleanup in the caller execution', async () => {
  const fixture = compileGeneratorFixture(`
    async function* values() {
      try { yield Promise.resolve(1); yield 2; }
      finally { identify(); }
    }
    async function call() {
      for await (const value of values()) { identify(); break; }
      return identify();
    }
    call;
  `);
  const call: () => Promise<string> = fixture.evaluate();
  expect(await fixture.context.run({ id: 'loop:a' }, call)).toBe('loop:a');
  expect(fixture.calls).toEqual(['loop:a', 'loop:a', 'loop:a']);
});

it('preserves yield delegation, rejection, throw and return cleanup semantics', async () => {
  const fixture = compileGeneratorFixture(`
    async function* inner() { yield Promise.resolve('first'); }
    async function* values() {
      try {
        yield* inner();
        try { yield Promise.reject(new Error('rejected')); }
        catch (error) { yield error.message; }
        try { yield 'ready'; }
        catch (error) { yield error.message; }
      } finally { await Promise.resolve(); identify(); }
    }
    values();
  `);
  const iterator: AsyncGenerator<string, string, unknown> = fixture.evaluate();
  const owned = <T>(fn: () => T) => fixture.context.run({ id: 'delegation:a' }, fn);
  expect(await owned(() => iterator.next())).toEqual({ value: 'first', done: false });
  expect(await owned(() => iterator.next())).toEqual({ value: 'rejected', done: false });
  expect(await owned(() => iterator.next())).toEqual({ value: 'ready', done: false });
  expect(await owned(() => iterator.throw(new Error('injected')))).toEqual({ value: 'injected', done: false });
  expect(await owned(() => iterator.return('closed'))).toEqual({ value: 'closed', done: true });
  expect(fixture.calls).toEqual(['delegation:a']);
  expect(fixture.context.capture()).toBeNull();
});


it('emits plain JavaScript from modern Flow sources before downstream compilation', async () => {
  const source = `
    /** @flow */
    type Result = { value: string, ... };
    async function call(input: string): Promise<Result> {
      await Promise.resolve();
      return ({ value: input }: Result);
    }
    call;
  `;
  const result = transformExecutionOwnership('flow.js', source);
  const invoke: (value: string) => Promise<{ value: string }> = runInNewContext(result?.code ?? '', {
    require: () => executionHelpers,
  });
  expect(await invoke('kept')).toEqual({ value: 'kept' });
});

it('leaves TypeScript typeof timer queries intact while instrumenting runtime reads', () => {
  const result = transformExecutionOwnership('timer.ts', 'let handle: ReturnType<typeof setTimeout>; const later = setTimeout;');
  expect(result?.code).toContain('typeof setTimeout');
  expect(result?.code).toContain('executionScheduler(setTimeout)');
});
