import { describe, expect, it } from 'vitest';
import { shouldTransformDispose, transformDisposeOwnership } from './disposeTransform';

describe('shouldTransformDispose', () => {
  it('accepts direct globalThis and global runtime dispose calls', () => {
    expect(shouldTransformDispose('globalThis._graniteMicroFrontend.dispose(callback)')).toBe(true);
    expect(shouldTransformDispose('global._graniteMicroFrontend.dispose(callback)')).toBe(true);
  });

  it('rejects code without a direct global runtime dispose call', () => {
    expect(shouldTransformDispose('globalThis._graniteMicroFrontend?.dispose(callback)')).toBe(false);
    expect(shouldTransformDispose('runtime._graniteMicroFrontend.dispose(callback)')).toBe(false);
    expect(shouldTransformDispose('_graniteMicroFrontend.dispose(callback)')).toBe(false);
    expect(shouldTransformDispose('dispose(callback)')).toBe(false);
  });

  it('injects the app name through the common source transformer', () => {
    const code = [
      'const value: number = 1;',
      'const Component = () => <View value={value} />;',
      'globalThis._graniteMicroFrontend.dispose(() => clear());',
    ].join('\n');

    const result = transformDisposeOwnership('/project/src/App.tsx', code, { appName: 'app-1' });

    expect(result).toContain('const value: number = 1;');
    expect(result).toContain('<View value={value} />');
    expect(result).toContain('globalThis._graniteMicroFrontend.dispose("app-1", () => clear());');
  });

  it('returns the original source without parsing when the guard does not match', () => {
    const code = '@@@ this does not need to parse';

    expect(transformDisposeOwnership('/project/src/App.ts', code, { appName: 'app-1' })).toBe(code);
    expect(
      transformDisposeOwnership(
        '/project/src/App.ts',
        'globalThis._graniteMicroFrontend.dispose(cleanup);',
        {}
      )
    ).toBe('globalThis._graniteMicroFrontend.dispose(cleanup);');
  });

  it('does not assign ownership to locally shadowed globals', () => {
    const code = [
      'function run(globalThis: Runtime) {',
      '  globalThis._graniteMicroFrontend.dispose(cleanup);',
      '}',
    ].join('\n');

    const result = transformDisposeOwnership('/project/src/App.ts', code, { appName: 'app-1' });

    expect(result).toContain('globalThis._graniteMicroFrontend.dispose(cleanup);');
    expect(result).not.toContain('dispose("app-1", cleanup)');
  });
});
