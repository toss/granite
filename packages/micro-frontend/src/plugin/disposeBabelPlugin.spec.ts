import * as babel from '@babel/core';
import { describe, expect, it } from 'vitest';
import { injectDisposeAppName } from './disposeBabelPlugin';

describe('injectDisposeAppName', () => {
  it('injects the build app name into direct dispose calls', () => {
    const result = transform(
      [
        'globalThis.__MICRO_FRONTEND__.dispose(cleanup);',
        'global.__MICRO_FRONTEND__.dispose(() => clear());',
        `globalThis.__MICRO_FRONTEND__.dispose('already-owned', cleanup);`,
      ].join('\n'),
      'app-1'
    );

    expect(result).toContain('globalThis.__MICRO_FRONTEND__.dispose("app-1", cleanup);');
    expect(result).toContain('global.__MICRO_FRONTEND__.dispose("app-1", () => clear());');
    expect(result).toContain(`globalThis.__MICRO_FRONTEND__.dispose('already-owned', cleanup);`);
  });

  it('does not transform indirect or computed calls', () => {
    const code = [
      `globalThis.__MICRO_FRONTEND__['dispose'](cleanup);`,
      `const dispose = globalThis.__MICRO_FRONTEND__.dispose;`,
      `dispose(cleanup);`,
    ].join('\n');

    const result = transform(code, 'app-1');
    expect(result).toContain(`globalThis.__MICRO_FRONTEND__['dispose'](cleanup);`);
    expect(result).toContain('const dispose = globalThis.__MICRO_FRONTEND__.dispose;');
    expect(result).toContain('dispose(cleanup);');
  });

  it('does not transform globalThis or global when they resolve to local bindings', () => {
    const code = [
      `function run(globalThis) { globalThis.__MICRO_FRONTEND__.dispose(cleanup); }`,
      `function disposeWithLocalGlobal() {`,
      `  const global = createLocalGlobal();`,
      `  global.__MICRO_FRONTEND__.dispose(cleanup);`,
      `}`,
    ].join('\n');

    const result = transform(code, 'app-1');
    expect(result).toContain('globalThis.__MICRO_FRONTEND__.dispose(cleanup);');
    expect(result).toContain('global.__MICRO_FRONTEND__.dispose(cleanup);');
    expect(result).not.toContain('dispose("app-1", cleanup)');
  });

  it('waits for the build handler to provide an app name', () => {
    const code = 'globalThis.__MICRO_FRONTEND__.dispose(cleanup);';

    expect(transform(code, undefined)).toBe(code);
  });
});

function transform(code: string, appName: string | undefined): string | undefined {
  return (
    babel.transformSync(code, {
      ast: false,
      babelrc: false,
      configFile: false,
      compact: false,
      plugins: [[injectDisposeAppName, { appName }]],
    })?.code ?? undefined
  );
}
