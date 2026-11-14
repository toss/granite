import { rolldown } from 'rollipop';
import { describe, expect, it } from 'vitest';
import { getNamespaceExportNames } from './exportNames';

// Runs the collector inside a real Rolldown build over in-memory modules, so parsing and module info are real.
async function namespaceNames(files: Record<string, string>, entry = '/pkg/index.js'): Promise<string[] | null> {
  let result: string[] | null | undefined;
  const bundle = await rolldown.rolldown({
    input: '\0probe',
    logLevel: 'silent',
    plugins: [
      {
        name: 'memory-files',
        resolveId(source, importer) {
          if (source === '\0probe') {
            return source;
          }
          const id = source.startsWith('/') ? source : new URL(source, `file://${importer ?? '/'}`).pathname;
          return id in files ? id : null;
        },
        load(id) {
          return files[id];
        },
      },
      {
        name: 'probe',
        async load(id) {
          if (id !== '\0probe') {
            return null;
          }
          result = await getNamespaceExportNames(this, entry);
          return 'export {};';
        },
      },
    ],
  });
  await bundle.generate({ format: 'esm' });
  await bundle.close();
  if (result === undefined) {
    throw new Error('The probe did not run');
  }
  return result;
}

describe('getNamespaceExportNames', () => {
  it('lists explicit and export * names in code unit order, without default from export *', async () => {
    const names = await namespaceNames({
      '/pkg/index.js':
        "export const b = 1; export default 2; export * from './star.js'; export { c as Z } from './c.js';",
      '/pkg/star.js': 'export const a = 1; export const _a = 2; export default 3;',
      '/pkg/c.js': 'export const c = 1;',
    });

    expect(names).toEqual(['Z', '_a', 'a', 'b', 'default']);
  });

  it('leaves out a name that two export * modules provide from different bindings', async () => {
    const names = await namespaceNames({
      '/pkg/index.js': "export * from './a.js'; export * from './b.js';",
      '/pkg/a.js': 'export const X = 1; export const onlyA = 1;',
      '/pkg/b.js': 'export const X = 2;',
    });

    expect(names).toEqual(['onlyA']);
  });

  it('keeps a name that export * modules provide from the same binding', async () => {
    const names = await namespaceNames({
      '/pkg/index.js': "export * from './a.js'; export * from './b.js'; export * from './d.js';",
      '/pkg/a.js': "export { Y } from './c.js';",
      '/pkg/b.js': "export * from './c.js';",
      '/pkg/d.js': "import { Y } from './c.js'; export { Y };",
      '/pkg/c.js': 'export const Y = 1;',
    });

    expect(names).toEqual(['Y']);
  });

  it('lets an explicit export hide the same name from export *', async () => {
    const names = await namespaceNames({
      '/pkg/index.js': "export const X = 0; export * from './a.js'; export * from './b.js';",
      '/pkg/a.js': 'export const X = 1;',
      '/pkg/b.js': 'export const X = 2;',
    });

    expect(names).toEqual(['X']);
  });

  it('includes export * as and follows circular export *', async () => {
    const names = await namespaceNames({
      '/pkg/index.js': "export * as ns from './a.js'; export * from './a.js';",
      '/pkg/a.js': "export const a = 1; export * from './index.js';",
    });

    expect(names).toEqual(['a', 'ns']);
  });

  it('leaves out type-only exports', async () => {
    const names = await namespaceNames(
      {
        '/pkg/index.ts':
          "export type { T } from './types.ts'; export * from './types.ts'; export interface I {} export const v = 1;",
        '/pkg/types.ts': 'export type T = string; export interface U {} export const runtime = 1;',
      },
      '/pkg/index.ts'
    );

    expect(names).toEqual(['runtime', 'v']);
  });

  it('returns null when export * reaches a CommonJS module', async () => {
    const names = await namespaceNames({
      '/pkg/index.js': "export const a = 1; export * from './cjs.js';",
      '/pkg/cjs.js': 'module.exports = { b: 1 };',
    });

    expect(names).toBeNull();
  });
});
