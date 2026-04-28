import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function importGetMonorepoRoot() {
  vi.resetModules();
  vi.doMock('./pnpapi', () => ({ pnpapi: undefined }));

  return (await import('./getMonorepoRoot')).getMonorepoRoot;
}

async function writePackageJson(dir: string, contents: object) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'package.json'), `${JSON.stringify(contents)}\n`);
}

describe('getMonorepoRoot', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'granite-monorepo-root-'));
  });

  afterEach(async () => {
    vi.doUnmock('./pnpapi');
    vi.resetModules();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns the base path when no workspace root exists', async () => {
    const getMonorepoRoot = await importGetMonorepoRoot();
    const appPath = path.join(tempDir, 'app');

    await writePackageJson(appPath, { name: 'app' });

    await expect(getMonorepoRoot(appPath)).resolves.toBe(appPath);
  });

  it('returns the parent npm or Yarn workspace root', async () => {
    const getMonorepoRoot = await importGetMonorepoRoot();
    const workspaceRoot = path.join(tempDir, 'workspace');
    const appPath = path.join(workspaceRoot, 'apps', 'app');

    await writePackageJson(workspaceRoot, {
      name: 'workspace',
      workspaces: ['apps/*'],
    });
    await writePackageJson(appPath, { name: 'app' });

    await expect(getMonorepoRoot(appPath)).resolves.toBe(workspaceRoot);
  });

  it('returns the parent pnpm workspace root', async () => {
    const getMonorepoRoot = await importGetMonorepoRoot();
    const workspaceRoot = path.join(tempDir, 'workspace');
    const appPath = path.join(workspaceRoot, 'apps', 'app');

    await writePackageJson(workspaceRoot, { name: 'workspace' });
    await fs.writeFile(path.join(workspaceRoot, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');
    await writePackageJson(appPath, { name: 'app' });

    await expect(getMonorepoRoot(appPath)).resolves.toBe(workspaceRoot);
  });

  it('uses the Plug-and-Play top-level package location when PnP is available', async () => {
    const workspaceRoot = path.join(tempDir, 'pnp-workspace');

    vi.resetModules();
    vi.doMock('./pnpapi', () => ({
      pnpapi: {
        topLevel: {},
        getPackageInformation: () => ({ packageLocation: workspaceRoot }),
      },
    }));

    const { getMonorepoRoot } = await import('./getMonorepoRoot');

    await expect(getMonorepoRoot(path.join(workspaceRoot, 'packages', 'app'))).resolves.toBe(workspaceRoot);
  });
});
