import { describe, expect, it } from 'vitest';
import { shouldTransformDispose, transformDisposeOwnership } from './disposeTransform';

describe('shouldTransformDispose', () => {
  it('accepts direct globalThis and global runtime dispose calls', () => {
    expect(shouldTransformDispose('globalThis.__MICRO_FRONTEND__.dispose(callback)')).toBe(true);
    expect(shouldTransformDispose('global.__MICRO_FRONTEND__.dispose(callback)')).toBe(true);
  });

  it('rejects code without a direct global runtime dispose call', () => {
    expect(shouldTransformDispose('globalThis.__MICRO_FRONTEND__?.dispose(callback)')).toBe(false);
    expect(shouldTransformDispose('runtime.__MICRO_FRONTEND__.dispose(callback)')).toBe(false);
    expect(shouldTransformDispose('__MICRO_FRONTEND__.dispose(callback)')).toBe(false);
    expect(shouldTransformDispose('dispose(callback)')).toBe(false);
  });

  it('injects the app name through the common source transformer', () => {
    const code = [
      'const value: number = 1;',
      'const Component = () => <View value={value} />;',
      'globalThis.__MICRO_FRONTEND__.dispose(() => clear());',
    ].join('\n');

    const result = transformDisposeOwnership('/project/src/App.tsx', code, { appName: 'app-1' });

    expect(result).toContain('const value: number = 1;');
    expect(result).toContain('<View value={value} />');
    expect(result).toContain('globalThis.__MICRO_FRONTEND__.dispose("app-1", () => clear());');
  });

  it('returns the original source without parsing when the guard does not match', () => {
    const code = '@@@ this does not need to parse';

    expect(transformDisposeOwnership('/project/src/App.ts', code, { appName: 'app-1' })).toBe(code);
    expect(
      transformDisposeOwnership('/project/src/App.ts', 'globalThis.__MICRO_FRONTEND__.dispose(cleanup);', {})
    ).toBe('globalThis.__MICRO_FRONTEND__.dispose(cleanup);');
  });

  it('does not assign ownership to locally shadowed globals', () => {
    const code = ['function run(globalThis: Runtime) {', '  globalThis.__MICRO_FRONTEND__.dispose(cleanup);', '}'].join(
      '\n'
    );

    const result = transformDisposeOwnership('/project/src/App.ts', code, { appName: 'app-1' });

    expect(result).toContain('globalThis.__MICRO_FRONTEND__.dispose(cleanup);');
    expect(result).not.toContain('dispose("app-1", cleanup)');
  });
});
