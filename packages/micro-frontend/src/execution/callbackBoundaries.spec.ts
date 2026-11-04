import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import * as helpers from './index';
import { getExecutionContext } from './context';
import { transformExecutionOwnership } from '../plugin-utils/executionTransform';

function compile(source: string, extra: Record<string, unknown> = {}) {
  const result = transformExecutionOwnership('boundary.js', source);
  return runInNewContext(result?.code ?? source, {
    Promise, setTimeout, clearTimeout, queueMicrotask,
    require: () => helpers, context: getExecutionContext(), ...extra,
  });
}

it('binds native Promise subscribers without replacing any global method', async () => {
  const original = Promise.prototype.then;
  const timer = globalThis.setTimeout;
  const invoke = compile('(promise => promise.then(() => context.capture()?.id))');
  const context = getExecutionContext();
  const gate = Promise.withResolvers<void>();
  const a = context.run({ id: 'a' }, () => invoke(gate.promise));
  const b = context.run({ id: 'b' }, () => invoke(gate.promise));
  gate.resolve();
  expect(await a).toBe('a');
  expect(await b).toBe('b');
  expect(Promise.prototype.then).toBe(original);
  expect(globalThis.setTimeout).toBe(timer);
});

it('captures each aliased timer registration and preserves cancellation handles', async () => {
  const invoke = compile(`
    const later = setTimeout;
    (done => { const cancelled = later(() => done('cancelled'), 0); clearTimeout(cancelled);
      return later(() => done(context.capture()?.id), 0); });
  `);
  const context = getExecutionContext();
  const values: unknown[] = [];
  await Promise.all(['a', 'b'].map(id => new Promise<void>(resolve => {
    context.run({ id }, () => invoke((value: unknown) => { values.push(value); resolve(); }));
  })));
  expect(values).toEqual(['a', 'b']);
});

it('does not wrap user methods or listener identities and preserves getter/argument order', () => {
  const events: string[] = [];
  const fn = function (this: unknown, argument: unknown) { events.push('call'); return [this, argument]; };
  const object = { get then() { events.push('get'); return fn; } };
  const result = compile('object.then(argument())', { object, argument: () => { events.push('argument'); return 7; } });
  expect(events).toEqual(['get', 'argument', 'call']);
  expect(result).toEqual([object, 7]);
  expect(compile('object.then', { object })).toBe(fn);
  const callback = () => {};
  const seen: unknown[] = [];
  compile('emitter.addListener(callback); emitter.removeListener(callback);', {
    callback, emitter: { addListener: (value: unknown) => seen.push(value), removeListener: (value: unknown) => seen.push(value) },
  });
  expect(seen).toEqual([callback, callback]);
});

it('preserves catch/finally results, thrown errors, and nested restoration', async () => {
  const invoke = compile(`(() => Promise.reject(new Error('expected')).catch(error => {
    if (context.capture()?.id !== 'a') throw new Error('lost catch');
    return error.message;
  }).finally(() => { if (context.capture()?.id !== 'a') throw new Error('lost finally'); }))`);
  expect(await getExecutionContext().run({ id: 'a' }, invoke)).toBe('expected');
  expect(getExecutionContext().capture()).toBeNull();
});

it('preserves optional Promise chains and short-circuits arguments', async () => {
  const invoke = compile('(promise => promise?.then?.(() => context.capture()?.id)?.then(value => value))');
  expect(invoke(null)).toBeUndefined();
  expect(await getExecutionContext().run({ id: 'optional' }, () => invoke(Promise.resolve()))).toBe('optional');
});

it('supports destructured scheduler aliases without rewriting shadowed names', async () => {
  const invoke = compile('const {setTimeout: later} = globalThis; (done => later(() => done(context.capture()?.id), 0));');
  const result = await new Promise(resolve => getExecutionContext().run({ id: 'destructured' }, () => invoke(resolve)));
  expect(result).toBe('destructured');
  const original = (callback: unknown) => callback;
  const callback = () => {};
  expect(compile('(function(setTimeout) { return setTimeout(callback); })(original)', { original, callback })).toBe(callback);
});

it('preserves typeof checks for unavailable schedulers and assignment targets', () => {
  const result = transformExecutionOwnership('checks.js', 'typeof requestIdleCallback');
  expect(runInNewContext(result?.code ?? 'typeof requestIdleCallback', { require: () => helpers })).toBe('undefined');
  const object = { then: 0 };
  compile('({ then: object.then } = { then: 7 });', { object });
  expect(object.then).toBe(7);
});
