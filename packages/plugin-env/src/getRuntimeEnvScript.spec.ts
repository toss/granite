import vm, { type Context } from 'vm';
import { describe, it, expect, beforeAll } from 'vitest';
import { getRuntimeEnvScript } from './getRuntimeEnvScript';

describe('getRuntimeEnvScript', () => {
  let globalThis: any;
  let context: ReturnType<typeof createSandboxContext>;

  function createSandboxContext(contextObject?: Context) {
    const context = vm.createContext(contextObject);

    function evaluate(code: string) {
      return new vm.Script(code).runInContext(context);
    }

    return { evaluate };
  }

  beforeAll(() => {
    globalThis = {};
    context = createSandboxContext({ globalThis });
    context.evaluate(
      getRuntimeEnvScript({
        VALUE_1: 123,
        VALUE_2: 'string',
        VALUE_3: true,
        VALUE_4: null,
        VALUE_5: undefined,
        VALUE_6: {},
      })
    );
  });

  it('should define `__granite.meta.env` in the global context', () => {
    expect(context.evaluate('typeof globalThis.__granite.meta.env')).toBe('object');
  });

  it('should define environment variables as strings', () => {
    expect(typeof globalThis.__granite.meta.env.VALUE_1).toBe('string');
    expect(typeof globalThis.__granite.meta.env.VALUE_2).toBe('string');
    expect(typeof globalThis.__granite.meta.env.VALUE_3).toBe('string');
    expect(typeof globalThis.__granite.meta.env.VALUE_4).toBe('string');
    expect(typeof globalThis.__granite.meta.env.VALUE_5).toBe('string');
    expect(typeof globalThis.__granite.meta.env.VALUE_6).toBe('string');
    expect(globalThis).toMatchInlineSnapshot(`
      {
        "__granite": {
          "meta": {
            "env": {
              "VALUE_1": "123",
              "VALUE_2": "string",
              "VALUE_3": "true",
              "VALUE_4": "null",
              "VALUE_5": "undefined",
              "VALUE_6": "[object Object]",
            },
          },
        },
      }
    `);
  });
});
