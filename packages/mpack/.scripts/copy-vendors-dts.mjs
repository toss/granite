import fs from 'node:fs';
import path from 'node:path';
import glob from 'fast-glob';

const ROOT = path.resolve(import.meta.dirname, '..');

const files = await glob(`src/vendors/**/*.d.ts`, {
  cwd: ROOT,
  ignore: ['**/*.{spec,test,stories}.*', '**/fixtures/**', '**/__snapshots__/**', '**/__storybook__/**'],
});

console.log('👉 Copying vendors `d.ts` files...');
console.log(files);

await Promise.all(files.map((path) => fs.copyFile(path, path.replace(/^src/, 'dist'))));
