import fs from 'fs';
import path from 'path';

export function getLocalTempDirectoryPath(rootDir: string) {
  return path.resolve(rootDir, '.granite');
}

export function prepareLocalDirectory(rootDir: string) {
  const localDir = getLocalTempDirectoryPath(rootDir);

  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  return localDir;
}
