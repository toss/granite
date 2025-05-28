import { mkdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { execa } from 'execa';

export type TmpDirManager = Awaited<ReturnType<typeof createTmpDir>>;

export async function createTmpDir() {
  const tmpDir = os.tmpdir();
  const randomString = Math.random().toString(36).substring(2, 15);
  const dir = path.join(tmpDir, randomString);
  console.log('Creating tmp dir', dir);
  await mkdir(dir, { recursive: true });

  const $ = (command: string, args: string[] = [], options: { cwd?: string } = {}) => {
    return execa(command, args, {
      cwd: options.cwd ? path.join(dir, options.cwd) : dir,
    });
  };
  return {
    dir,
    $,
    cleanup: async () => {
      await rm(dir, {
        recursive: true,
      });
    },
  };
}
