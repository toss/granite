import * as fs from 'fs/promises';
import { logger } from '../logger';

async function removeDir(dirPath: string) {
  try {
    await fs.access(dirPath);
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export function cleanupOutputDirectory(directories: string[]) {
  logger.info(`🧹 빌드 폴더를 정리합니다...`);

  return Promise.all([directories.map(removeDir)]);
}
