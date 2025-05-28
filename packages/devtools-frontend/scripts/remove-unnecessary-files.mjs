import fs from 'fs/promises';
import path from 'path';
import pLimit from 'p-limit';
import glob from 'tiny-glob';

const basePath = path.resolve(import.meta.dirname, '../src/front_end');
const limit = pLimit(100);
const files = await glob(`${basePath}/**/*.{d.ts,map}`);

console.log(`Found ${files.length} files`);

await Promise.all(files.map((file) => limit(() => fs.rm(file))));

console.log('✅ Done');
