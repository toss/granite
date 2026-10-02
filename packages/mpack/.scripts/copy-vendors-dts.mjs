import fs from 'node:fs/promises';
import path from 'node:path';
import glob from 'fast-glob';

const ROOT = path.resolve(import.meta.dirname, '..');

const files = await glob(`src/vendors/**/*.d.ts`, {
  cwd: ROOT,
  ignore: ['**/*.{spec,test,stories}.*', '**/fixtures/**', '**/__snapshots__/**', '**/__storybook__/**'],
});

console.log('👉 Copying vendors `d.ts` files...');
console.log(files);

await Promise.all(
  files.map(async (file) => {
    const target = file.replace(/^src/, 'dist');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(file, target);
  })
);
