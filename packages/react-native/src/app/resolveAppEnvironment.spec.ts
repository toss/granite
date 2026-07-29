import { afterEach, describe, expect, it } from 'vitest';
import { resolveAppEnvironment } from './resolveAppEnvironment';

describe('resolveAppEnvironment', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__granite');
  });

  it('captures the registering bundle environment before another service changes the global', () => {
    Reflect.set(globalThis, '__granite', {
      app: {
        scheme: 'granite',
        host: 'showcase',
      },
    });

    const environment = resolveAppEnvironment();

    Reflect.set(globalThis, '__granite', {
      app: {
        scheme: 'granite',
        host: 'bare',
      },
    });

    expect(environment).toEqual({
      scheme: 'granite',
      host: 'showcase',
    });
  });
});
