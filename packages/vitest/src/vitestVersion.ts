import fs from 'node:fs';
import path from 'node:path';
import { resolvePackageRoot } from './mirror';

export const VITEST_VITE_8_SUPPORT_VERSION = '4.1.0-beta.4';

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

function parseVersion(version: string): ParsedVersion | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);

  if (match == null) {
    return null;
  }

  const [, major, minor, patch, prerelease] = match;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease == null ? [] : prerelease.split('.'),
  };
}

function comparePrereleaseIdentifiers(left: string, right: string) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const leftIsNumber = Number.isInteger(leftNumber) && `${leftNumber}` === left;
  const rightIsNumber = Number.isInteger(rightNumber) && `${rightNumber}` === right;

  if (leftIsNumber && rightIsNumber) {
    return leftNumber - rightNumber;
  }

  if (leftIsNumber) {
    return -1;
  }

  if (rightIsNumber) {
    return 1;
  }

  return left.localeCompare(right);
}

export function isVitestVersionAtLeast(version: string, minimumVersion: string) {
  const parsedVersion = parseVersion(version);
  const parsedMinimumVersion = parseVersion(minimumVersion);

  if (parsedVersion == null || parsedMinimumVersion == null) {
    return false;
  }

  if (parsedVersion.major !== parsedMinimumVersion.major) {
    return parsedVersion.major > parsedMinimumVersion.major;
  }

  if (parsedVersion.minor !== parsedMinimumVersion.minor) {
    return parsedVersion.minor > parsedMinimumVersion.minor;
  }

  if (parsedVersion.patch !== parsedMinimumVersion.patch) {
    return parsedVersion.patch > parsedMinimumVersion.patch;
  }

  if (parsedVersion.prerelease.length === 0) {
    return true;
  }

  if (parsedMinimumVersion.prerelease.length === 0) {
    return false;
  }

  const prereleaseLength = Math.max(
    parsedVersion.prerelease.length,
    parsedMinimumVersion.prerelease.length,
  );

  for (let index = 0; index < prereleaseLength; index += 1) {
    const leftIdentifier = parsedVersion.prerelease[index];
    const rightIdentifier = parsedMinimumVersion.prerelease[index];

    if (leftIdentifier == null) {
      return false;
    }

    if (rightIdentifier == null) {
      return true;
    }

    const comparison = comparePrereleaseIdentifiers(leftIdentifier, rightIdentifier);

    if (comparison !== 0) {
      return comparison > 0;
    }
  }

  return true;
}

export function resolveInstalledVitestVersion(workspaceRoot: string) {
  try {
    const vitestPackageRoot = resolvePackageRoot('vitest', workspaceRoot);
    const vitestPackageJsonPath = path.join(vitestPackageRoot, 'package.json');
    const vitestPackageJson = JSON.parse(fs.readFileSync(vitestPackageJsonPath, 'utf8')) as {
      version?: string;
    };

    return vitestPackageJson.version ?? null;
  } catch {
    return null;
  }
}
