import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  shouldTransformReactNativeFile,
  transformReactNativeSource,
} from './transpile';

export const DEFAULT_PLATFORM = 'ios';
export const GRANITE_VITEST_RN_CACHE_DIRECTORY = '.granite-vitest-rn-cache';
export const GRANITE_VITEST_RN_CACHE_ROOT_ENV = 'GRANITE_VITEST_RN_CACHE_ROOT';
export const GRANITE_VITEST_RN_PACKAGES_DIRECTORY = 'packages';
export const REACT_NATIVE_PLATFORMS = ['android', 'ios', 'native'] as const;

function ensureDirectory(targetPath: string) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function resolveWorkspaceRequire(workspaceRoot: string) {
  return createRequire(path.join(workspaceRoot, 'package.json'));
}

export function resolvePackageRoot(packageName: string, requireRoot: string) {
  const packageRequire = createRequire(path.join(requireRoot, 'package.json'));
  const packageJsonPath = packageRequire.resolve(`${packageName}/package.json`);

  return path.dirname(packageJsonPath);
}

export function getScopedReactNativePackageNames(workspaceRoot: string) {
  const reactNativePackageJsonPath = resolveWorkspaceRequire(workspaceRoot).resolve(
    'react-native/package.json',
  );
  const reactNativePackageJson = JSON.parse(fs.readFileSync(reactNativePackageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  return Object.keys(reactNativePackageJson.dependencies ?? {}).filter(
    (dependencyName) =>
      dependencyName.startsWith('@react-native/') ||
      dependencyName.startsWith('@react-native-community/'),
  );
}

export function resolveReactNativePackageRoots(workspaceRoot: string) {
  const reactNativeRoot = resolvePackageRoot('react-native', workspaceRoot);

  return [
    reactNativeRoot,
    ...getScopedReactNativePackageNames(workspaceRoot).map((dependencyName) =>
      resolvePackageRoot(dependencyName, reactNativeRoot),
    ),
  ];
}

function mirrorFile(sourcePath: string, destinationPath: string) {
  ensureDirectory(path.dirname(destinationPath));

  if (shouldTransformReactNativeFile(sourcePath)) {
    const source = fs.readFileSync(sourcePath, 'utf8');

    try {
      fs.writeFileSync(destinationPath, transformReactNativeSource(sourcePath, source));
      return;
    } catch {
      fs.writeFileSync(destinationPath, source);
      return;
    }
  }

  fs.copyFileSync(sourcePath, destinationPath);
}

function mirrorTree(sourceRoot: string, destinationRoot: string) {
  const entries = fs.readdirSync(sourceRoot, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const destinationPath = path.join(destinationRoot, entry.name);

    if (entry.isDirectory()) {
      mirrorTree(sourcePath, destinationPath);
      continue;
    }

    mirrorFile(sourcePath, destinationPath);
  }
}

export function synthesizeDefaultPlatformFiles(destinationRoot: string) {
  const fallbackCandidates: Array<{ sourcePath: string; fallbackPath: string; priority: number }> =
    [];

  function collectCandidates(currentRoot: string) {
    const entries = fs.readdirSync(currentRoot, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentRoot, entry.name);

      if (entry.isDirectory()) {
        collectCandidates(entryPath);
        continue;
      }

      const match = entry.name.match(/^(.*)\.(ios|native)\.(js|jsx|ts|tsx)$/);
      if (match == null) {
        continue;
      }

      const [, basename, platform, extension] = match;
      fallbackCandidates.push({
        sourcePath: entryPath,
        fallbackPath: path.join(currentRoot, `${basename}.${extension}`),
        priority: platform === DEFAULT_PLATFORM ? 0 : 1,
      });
    }
  }

  collectCandidates(destinationRoot);

  fallbackCandidates
    .sort((left, right) => left.priority - right.priority)
    .forEach(({ sourcePath, fallbackPath }) => {
      if (!fs.existsSync(fallbackPath)) {
        fs.copyFileSync(sourcePath, fallbackPath);
      }
    });
}

function mirrorResolvedPackage(packageName: string, requireRoot: string, destinationRoot: string) {
  const sourceRoot = resolvePackageRoot(packageName, requireRoot);
  const destinationPath = path.join(destinationRoot, ...packageName.split('/'));

  mirrorTree(sourceRoot, destinationPath);
}

export function buildReactNativeMirror(workspaceRoot: string) {
  const reactNativeRoot = resolvePackageRoot('react-native', workspaceRoot);
  const cacheRoot = path.join(
    workspaceRoot,
    GRANITE_VITEST_RN_CACHE_DIRECTORY,
    `${process.pid}`,
    GRANITE_VITEST_RN_PACKAGES_DIRECTORY,
  );

  fs.rmSync(cacheRoot, { force: true, recursive: true });
  ensureDirectory(cacheRoot);

  mirrorResolvedPackage('react-native', workspaceRoot, cacheRoot);

  getScopedReactNativePackageNames(workspaceRoot).forEach((dependencyName) => {
    mirrorResolvedPackage(dependencyName, reactNativeRoot, cacheRoot);
  });

  synthesizeDefaultPlatformFiles(cacheRoot);

  return cacheRoot;
}
