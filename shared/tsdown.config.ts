import { defineConfig } from 'tsdown';

const sharedDir = import.meta.dirname;

export default defineConfig([
  {
    entry: [`${sharedDir}/runtime.ts`],
    outDir: sharedDir,
    clean: false,
  },
]);
