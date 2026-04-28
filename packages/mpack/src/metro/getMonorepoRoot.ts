import fs, { constants } from 'fs/promises';
import path from 'path';
import { pnpapi } from './pnpapi';

/**
 * Returns the appropriate root path for either a single-package project or a workspace-based project.
 */
export async function getMonorepoRoot(basePath: string) {
  if (pnpapi) {
    return pnpapi.getPackageInformation(pnpapi.topLevel).packageLocation ?? null;
  }

  let curr = basePath;
  while (curr !== path.dirname(curr)) {
    if (await isWorkspace(curr)) {
      return curr;
    }

    curr = path.dirname(curr);
  }

  // If no workspace root is found up to the filesystem root, treat it as a single-package project.
  return basePath;
}

async function safeReadPackageJson(basePath: string) {
  try {
    return JSON.parse(await fs.readFile(path.join(basePath, 'package.json'), 'utf-8'));
  } catch {
    /* noop */
  }
}

async function safeAccess(path: string) {
  try {
    await fs.access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function isWorkspace(basePath: string) {
  const packageJson = await safeReadPackageJson(basePath);
  const hasPackageJson = Boolean(packageJson);
  const hasWorkspacesField = Array.isArray(packageJson?.workspaces);

  // npm, Yarn
  if (hasWorkspacesField) {
    return true;
  }

  // pnpm
  const hasWorkspaceManifest = await safeAccess(path.join(basePath, 'pnpm-workspace.yaml'));
  if (hasPackageJson && hasWorkspaceManifest) {
    return true;
  }

  return false;
}
