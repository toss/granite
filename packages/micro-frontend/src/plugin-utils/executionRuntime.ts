import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

/** Generated imports must resolve from this plugin, even in dependencies that do not declare it. */
export function executionRuntimeEntries(): Record<string, string> {
  return Object.fromEntries([
    ['@granite-js/micro-frontend/execution', 'index'],
    ['@granite-js/micro-frontend/execution/bootstrap', 'bootstrap'],
    ['@granite-js/micro-frontend/execution/renderer', 'renderer'],
  ].map(([specifier, filename]) => {
    const compiled = fileURLToPath(new URL(`../execution/${filename}.js`, import.meta.url));
    return [specifier, existsSync(compiled) ? compiled : compiled.replace(/\.js$/, '.ts')];
  }));
}
