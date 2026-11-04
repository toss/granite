import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

// Resolved by the compiler plugins only; this is not a package export.
export const EXECUTION_RUNTIME_ID = 'granite:execution-internal';

export function executionRuntimePath(): string {
  const compiled = fileURLToPath(new URL('../execution/index.js', import.meta.url));
  return existsSync(compiled) ? compiled : compiled.replace(/\.js$/, '.ts');
}

export const executionPrelude = `import { initializeExecution } from '${EXECUTION_RUNTIME_ID}';\ninitializeExecution();\n`;
