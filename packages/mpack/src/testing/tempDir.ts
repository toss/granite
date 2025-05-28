import * as fs from 'fs/promises';
import * as os from 'os';
import path from 'path';

const PREFIX = 'mpack';
const tmpdirs = new Set<string>();

export async function createTmpDir() {
  const dir = await fs.realpath(os.tmpdir());
  const tmpdir = path.join(dir, generateTmpName());

  await fs.mkdir(tmpdir);

  tmpdirs.add(tmpdir);

  return tmpdir;
}

export async function cleanupTmpDirs() {
  const tasks: Promise<void>[] = [];

  for (const tmpdir of tmpdirs) {
    tasks.push(fs.rm(tmpdir, { force: true, recursive: true }));
  }

  await Promise.all(tasks);
}

function generateTmpName() {
  const hash = Math.ceil(Math.random() * 0x100000000)
    .toString(16)
    .padStart(8, `0`);

  return `${PREFIX}-${hash}`;
}
