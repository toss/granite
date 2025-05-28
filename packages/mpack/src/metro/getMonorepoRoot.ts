import fs, { constants } from 'fs/promises';
import path from 'path';
import { pnpapi } from './pnpapi';

/**
 * 단일 혹은 워크스페이스 기반 프로젝트 환경에서 적절한 루트 경로를 가져오는 유틸입니다
 */
export async function getMonorepoRoot(basePath: string) {
  if (pnpapi) {
    return pnpapi.getPackageInformation(pnpapi.topLevel).packageLocation ?? null;
  }

  let curr = basePath;
  while (curr !== path.dirname(curr)) {
    if (await isWorkspace(basePath)) {
      return curr;
    }

    curr = path.dirname(curr);
  }

  // 루트 경로까지 탐색해도 workspaces 필드를 가진 `package.json` 파일이 없는 경우,
  // 워크스페이스 프로젝트가 아닌 단일 프로젝트로 간주하여 기준 경로를 그대로 반환
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

  // NPM, Yarn
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
