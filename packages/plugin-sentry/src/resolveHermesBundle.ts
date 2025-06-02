import * as fs from 'fs';

export function tryResolveHermesBundle(jsBundlePath: string) {
  const lookupPath = `${jsBundlePath}.hbc`;

  return fs.existsSync(lookupPath) ? { hbc: lookupPath, sourcemap: `${lookupPath}.map` } : null;
}
