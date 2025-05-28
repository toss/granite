import fs from 'fs';
import path from 'path';

export function getPackageRoot(): string {
  let cwd = process.cwd();
  const root = path.parse(cwd).root;

  while (cwd !== root) {
    if (fs.existsSync(path.join(cwd, 'package.json'))) {
      return cwd;
    }
    cwd = path.dirname(cwd);
  }

  return cwd;
}
