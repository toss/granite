import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/adapter.spec.ts', 'src/bundler/plugins/requireContextPlugin/**/*.spec.ts'] },
});
