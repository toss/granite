import fs from 'fs/promises';

export function isExist(path: string) {
  return fs
    .access(path)
    .then(() => true)
    .catch((error) => {
      if (error.code === 'ENOENT') {
        return false;
      }

      throw error;
    });
}
