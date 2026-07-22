import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeMonoHermes, isMonoHermes } from './monoHermes';

describe('isMonoHermes', () => {
  beforeEach(() => {
    Reflect.set(globalThis, '__MICRO_FRONTEND__', { __INSTANCES__: [], __SHARED__: {} });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  });

  it('returns false when the micro-frontend runtime is not initialized', () => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');

    expect(isMonoHermes()).toBe(false);
  });

  it('initializes mono Hermes mode from host initial props', () => {
    initializeMonoHermes({ _monoHermes: true });

    expect(isMonoHermes()).toBe(true);
  });

  it('does not write a false runtime flag', () => {
    initializeMonoHermes({ _monoHermes: false });

    expect(isMonoHermes()).toBe(false);
    expect(globalThis.__MICRO_FRONTEND__.__IS_MONO_HERMES__).toBeUndefined();
  });

  it('does not overwrite an enabled runtime from false initial props', () => {
    initializeMonoHermes({ _monoHermes: true });
    initializeMonoHermes({ _monoHermes: false });

    expect(isMonoHermes()).toBe(true);
  });
});
