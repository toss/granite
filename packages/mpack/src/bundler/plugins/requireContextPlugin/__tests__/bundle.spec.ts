import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { build } from 'esbuild';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { requireContextPlugin } from '../requireContextPlugin';

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpack-context-'));
  await fs.mkdir(path.join(root, 'pages/nested'), { recursive: true });
  await fs.writeFile(path.join(root, 'pages/index.ts'), "export const name = 'home';");
  await fs.writeFile(path.join(root, 'pages/nested/details.tsx'), "export const name = 'details';");
  await fs.writeFile(path.join(root, 'pages/ignored.txt'), 'not a screen');
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('require context bundle execution', () => {
  it.each([
    'require.context.ts',
    'require.context.tsx',
    'require.context.legacy.ts',
    'require.context.legacy.tsx',
    'require.context.custom.ts',
    'require.context.dev.ios.tsx',
    'require.context.js',
    'require.context.custom.jsx',
    'preview.require.context.custom.js',
  ])('includes screens when the entry is %s', async (filename) => {
    const entry = path.join(root, filename);
    await fs.writeFile(entry, "export const context = require.context('./pages', true, /\\.[jt]sx?$/);");
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      format: 'cjs',
      plugins: [requireContextPlugin()],
    });
    const sandbox = { module: { exports: {} as { context: { (key: string): { name: string }; keys(): string[] } } } };
    vm.runInNewContext(result.outputFiles[0]!.text, sandbox, { timeout: 1000 });
    const { context } = sandbox.module.exports;
    expect(Array.from(context.keys()).sort()).toEqual(['./index.ts', './nested/details.tsx']);
    expect(context('./index.ts').name).toBe('home');
    expect(context('./nested/details.tsx').name).toBe('details');
  });
});
