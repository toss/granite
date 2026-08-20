import * as babel from '@babel/core';
import { describe, expect, it } from 'vitest';
import { injectDisposeAppName } from './disposeBabelPlugin';

describe('injectDisposeAppName', () => {
  it('injects the build app name into direct dispose calls', () => {
    const result = transform(
      [
        'globalThis._graniteMicroFrontend.dispose(cleanup);',
        'global._graniteMicroFrontend.dispose(() => clear());',
        `globalThis._graniteMicroFrontend.dispose('already-owned', cleanup);`,
      ].join('\n'),
      'app-1'
    );

    expect(result).toContain('globalThis._graniteMicroFrontend.dispose("app-1", cleanup);');
    expect(result).toContain('global._graniteMicroFrontend.dispose("app-1", () => clear());');
    expect(result).toContain(`globalThis._graniteMicroFrontend.dispose('already-owned', cleanup);`);
  });

  it('does not transform indirect or computed calls', () => {
    const code = [
      `globalThis._graniteMicroFrontend['dispose'](cleanup);`,
      `const dispose = globalThis._graniteMicroFrontend.dispose;`,
      `dispose(cleanup);`,
    ].join('\n');

    const result = transform(code, 'app-1');
    expect(result).toContain(`globalThis._graniteMicroFrontend['dispose'](cleanup);`);
    expect(result).toContain('const dispose = globalThis._graniteMicroFrontend.dispose;');
    expect(result).toContain('dispose(cleanup);');
  });

  it('does not transform globalThis or global when they resolve to local bindings', () => {
    const code = [
      `function run(globalThis) { globalThis._graniteMicroFrontend.dispose(cleanup); }`,
      `function disposeWithLocalGlobal() {`,
      `  const global = createLocalGlobal();`,
      `  global._graniteMicroFrontend.dispose(cleanup);`,
      `}`,
    ].join('\n');

    const result = transform(code, 'app-1');
    expect(result).toContain('globalThis._graniteMicroFrontend.dispose(cleanup);');
    expect(result).toContain('global._graniteMicroFrontend.dispose(cleanup);');
    expect(result).not.toContain('dispose("app-1", cleanup)');
  });

  it('waits for the build handler to provide an app name', () => {
    const code = 'globalThis._graniteMicroFrontend.dispose(cleanup);';

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
