import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyToolTemplates } from './copyToolTemplate';

describe('copyToolTemplates', () => {
  let tmpDir: string | null = null;

  afterEach(async () => {
    if (tmpDir != null) {
      await fs.rm(tmpDir, { force: true, recursive: true });
      tmpDir = null;
    }
  });

  it('merges package.json changes from multiple tool templates', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-granite-app-'));

    const appName = 'test-app';
    const appPath = path.join(tmpDir, appName);
    await fs.mkdir(appPath, { recursive: true });
    await fs.writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify(
        {
          name: appName,
          scripts: {
            dev: 'granite dev',
          },
          devDependencies: {
            typescript: '^5.0.0',
          },
        },
        null,
        2
      )
    );

    const cwd = process.cwd();
    process.chdir(tmpDir);

    try {
      await copyToolTemplates(['biome', 'eslint-prettier'], { appPath: appName });
    } finally {
      process.chdir(cwd);
    }

    const packageJson = JSON.parse(await fs.readFile(path.join(appPath, 'package.json'), 'utf-8'));
    expect(packageJson.scripts).toMatchObject({
      dev: 'granite dev',
      lint: 'eslint .',
    });
    expect(packageJson.devDependencies).toMatchObject({
      typescript: '^5.0.0',
      '@biomejs/biome': '^1.9.4',
      '@eslint/js': '^9.17.0',
      eslint: '^9.17.0',
      'eslint-plugin-react': '^7.37.2',
      prettier: '3.4.2',
      'typescript-eslint': '^8.31.0',
    });

    await expect(fs.access(path.join(appPath, 'biome.json'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(appPath, 'eslint.config.mjs'))).resolves.toBeUndefined();
  });
});
