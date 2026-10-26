import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { instrumentRenderer, transformRendererExecution } from './rendererExecutionTransform';

const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve('react-native/package.json'));

describe('React Native execution compiler', () => {
  for (const mode of ['dev', 'prod']) {
    it(`instruments the installed RN 0.84 ${mode} renderer and preserves executable JavaScript`, () => {
      const filename = path.join(root, `Libraries/Renderer/implementations/ReactFabric-${mode}.js`);
      const source = readFileSync(filename, 'utf8');
      const result = transformRendererExecution(filename, source);
      expect(result?.code).toContain('granite:execution-internal');
      expect(result?.map).toBeTruthy();
      expect(() => new Script(result?.code ?? '')).not.toThrow();
    });
  }

  it('fails instead of producing a partially instrumented renderer if a required boundary changes', () => {
    const filename = path.join(root, 'Libraries/Renderer/implementations/ReactFabric-prod.js');
    const source = readFileSync(filename, 'utf8').replace('function beginWork(', 'function changedBeginWork(');
    expect(() => instrumentRenderer(source, filename)).toThrow('contract mismatch for beginWork');
  });

  it('preserves imported legacy utilities but rejects an actual legacy root', () => {
    expect(transformRendererExecution('/service/Component.js', 'function Component() {}')).toBeNull();
    const filename = path.join(root, 'Libraries/Renderer/implementations/ReactNativeRenderer-prod.js');
    const legacy = transformRendererExecution(filename,
      'exports.findNodeHandle = function (value) { return value; }; exports.render = function () { throw new Error("entered"); };');
    const exports: { findNodeHandle?: (value: number) => number; render?: () => void } = {};
    expect(() => new Script(legacy?.code ?? '').runInNewContext({ exports })).not.toThrow();
    expect(exports.findNodeHandle?.(42)).toBe(42);
    expect(() => exports.render?.()).toThrow('Fabric renderer');
  });

  for (const mode of ['dev', 'prod']) {
    it(`recognizes the installed legacy ${mode} render entry`, () => {
      const filename = path.join(root, `Libraries/Renderer/implementations/ReactNativeRenderer-${mode}.js`);
      const result = transformRendererExecution(filename, readFileSync(filename, 'utf8'));
      expect(result?.code).toContain('Fabric renderer');
      expect(result?.code).toContain('exports.findNodeHandle');
      expect(() => new Script(result?.code ?? '')).not.toThrow();
    });
  }
});
