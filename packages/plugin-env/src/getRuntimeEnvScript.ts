import type { SerializableObject } from './types';

export function getRuntimeEnvScript(serializableObject: SerializableObject) {
  const assignExpressions = Object.entries(serializableObject).map(
    ([key, value]) => `global.__granite.meta.env['${key}'] = ${JSON.stringify(String(value))};`
  );

  return `
  (function (global) {
    global.__granite = global.__granite || {};
    global.__granite.meta = global.__granite.meta || {};
    global.__granite.meta.env = global.__granite.meta.env || {};
    ${assignExpressions.join('\n')}
  })(
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof global !== 'undefined'
      ? global
      : typeof window !== 'undefined'
      ? window
      : this
  );
  `;
}
