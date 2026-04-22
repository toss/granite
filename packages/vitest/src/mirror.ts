import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shouldTransformReactNativeFile,
  transformReactNativeSource,
} from './transpile';

export const DEFAULT_PLATFORM = 'ios';
export const GRANITE_VITEST_RN_CACHE_DIRECTORY = 'vitest-react-native-cache';
export const GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY = 'entries';
export const GRANITE_VITEST_RN_PACKAGES_DIRECTORY = 'packages';
export const REACT_NATIVE_PLATFORMS = ['android', 'ios', 'native'] as const;

const GRANITE_VITEST_RN_CACHE_GC_LOCK_FILENAME = '.gc.lock';
const GRANITE_VITEST_RN_CACHE_METADATA_FILENAME = 'meta.json';
const GRANITE_VITEST_RN_CACHE_TMP_PREFIX = '.tmp-';
const GRANITE_VITEST_RN_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const GRANITE_VITEST_RN_CACHE_MAX_SIZE_BYTES = 1024 * 1024 * 1024;
const GRANITE_VITEST_RN_TEMP_ENTRY_MAX_AGE_MS = 60 * 60 * 1000;
const DEFAULT_VITEST_CACHE_DIRECTORY = '.vitest';
const MIRROR_CACHE_KEY_VERSION = 'v1';

type MirrorCacheMetadata = {
  cacheKey: string;
  createdAt: string;
  lastAccessedAt: string;
  packageRoots: string[];
  sizeBytes: number;
  transformDependencyVersions: {
    fastFlowTransform: string;
  };
  transformImplementationHash: string;
};

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type MirroredReactNativePackage = {
  packageName: string;
  requireRoot: string;
};

const currentMirrorModulePath = fs.realpathSync(fileURLToPath(import.meta.url));
const currentMirrorModuleDirectory = path.dirname(currentMirrorModulePath);

function ensureDirectory(targetPath: string) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function resolveVitestCacheDirectory(workspaceRoot: string, cacheDirectory?: string) {
  return cacheDirectory ?? path.join(workspaceRoot, DEFAULT_VITEST_CACHE_DIRECTORY);
}

function getReactNativeMirrorCacheRoot(workspaceRoot: string, cacheDirectory?: string) {
  return path.join(
    resolveVitestCacheDirectory(workspaceRoot, cacheDirectory),
    GRANITE_VITEST_RN_CACHE_DIRECTORY,
  );
}

function getReactNativeMirrorEntriesRoot(workspaceRoot: string, cacheDirectory?: string) {
  return path.join(
    getReactNativeMirrorCacheRoot(workspaceRoot, cacheDirectory),
    GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  );
}

function getReactNativeMirrorEntryRoot(
  workspaceRoot: string,
  cacheKey: string,
  cacheDirectory?: string,
) {
  return path.join(getReactNativeMirrorEntriesRoot(workspaceRoot, cacheDirectory), cacheKey);
}

function getReactNativeMirrorPackagesRoot(entryRoot: string) {
  return path.join(entryRoot, GRANITE_VITEST_RN_PACKAGES_DIRECTORY);
}

function getReactNativeMirrorMetadataPath(entryRoot: string) {
  return path.join(entryRoot, GRANITE_VITEST_RN_CACHE_METADATA_FILENAME);
}

function getFastFlowTransformVersion() {
  const packageRequire = createRequire(import.meta.url);
  const fastFlowTransformEntryPath = packageRequire.resolve('fast-flow-transform');
  const fastFlowTransformPackageRoot = path.dirname(path.dirname(fastFlowTransformEntryPath));
  const fastFlowTransformPackageJsonPath = path.join(fastFlowTransformPackageRoot, 'package.json');
  const fastFlowTransformPackageJson = JSON.parse(
    fs.readFileSync(fastFlowTransformPackageJsonPath, 'utf8'),
  ) as {
    version?: string;
  };

  return fastFlowTransformPackageJson.version ?? 'unknown';
}

function readPackageManifest(packageJsonPath: string) {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageManifest;
}

function getPackageManifestDependencyNames(packageManifest: PackageManifest) {
  return Object.keys({
    ...(packageManifest.dependencies ?? {}),
    ...(packageManifest.devDependencies ?? {}),
    ...(packageManifest.optionalDependencies ?? {}),
    ...(packageManifest.peerDependencies ?? {}),
  }).sort();
}

function shouldMirrorReactNativeDependency(packageName: string) {
  return (
    packageName === 'jest-react-native' ||
    packageName.startsWith('@react-native/') ||
    packageName.startsWith('@react-native-community/')
  );
}

function hashFileContents(hasher: ReturnType<typeof createHash>, rootPath: string, filePath: string) {
  hasher.update(path.relative(rootPath, filePath));
  hasher.update('\0');
  hasher.update(fs.readFileSync(filePath));
  hasher.update('\0');
}

function hashDirectoryContents(
  hasher: ReturnType<typeof createHash>,
  rootPath: string,
  currentPath: string = rootPath,
) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      hashDirectoryContents(hasher, rootPath, entryPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    hashFileContents(hasher, rootPath, entryPath);
  }
}

function hashImplementationFiles() {
  const hasher = createHash('sha256');
  const extension = path.extname(currentMirrorModulePath);
  const implementationFiles = [
    currentMirrorModulePath,
    path.join(currentMirrorModuleDirectory, `transpile${extension}`),
  ]
    .filter((implementationFile, index, allFiles) => {
      if (!fs.existsSync(implementationFile)) {
        return false;
      }

      return allFiles.indexOf(implementationFile) === index;
    })
    .sort();

  for (const implementationFile of implementationFiles) {
    hasher.update(path.basename(implementationFile));
    hasher.update('\0');
    hasher.update(fs.readFileSync(implementationFile));
    hasher.update('\0');
  }

  return hasher.digest('hex');
}

export function collectMirroredReactNativePackageNames(
  workspacePackageManifest: PackageManifest,
  reactNativePackageManifest: PackageManifest,
) {
  const packageNames = new Set<string>();

  for (const dependencyName of Object.keys(reactNativePackageManifest.dependencies ?? {})) {
    if (dependencyName.startsWith('@react-native/')) {
      packageNames.add(dependencyName);
    }
  }

  for (const dependencyName of getPackageManifestDependencyNames(workspacePackageManifest)) {
    if (dependencyName !== 'react-native' && shouldMirrorReactNativeDependency(dependencyName)) {
      packageNames.add(dependencyName);
    }
  }

  return [...packageNames].sort();
}

function getMirroredReactNativePackages(workspaceRoot: string): MirroredReactNativePackage[] {
  const reactNativeRoot = resolvePackageRoot('react-native', workspaceRoot);
  const workspacePackageManifest = readPackageManifest(path.join(workspaceRoot, 'package.json'));
  const reactNativePackageManifest = readPackageManifest(path.join(reactNativeRoot, 'package.json'));
  const workspaceDependencyNames = new Set(getPackageManifestDependencyNames(workspacePackageManifest));

  return collectMirroredReactNativePackageNames(
    workspacePackageManifest,
    reactNativePackageManifest,
  ).map((packageName) => ({
    packageName,
    requireRoot: workspaceDependencyNames.has(packageName) ? workspaceRoot : reactNativeRoot,
  }));
}

export function getMirroredReactNativePackageNames(workspaceRoot: string) {
  return getMirroredReactNativePackages(workspaceRoot).map(({ packageName }) => packageName);
}

function computeReactNativeMirrorCacheKey(workspaceRoot: string) {
  const hasher = createHash('sha256');
  const packageRoots = resolveReactNativePackageRoots(workspaceRoot).sort();
  const transformImplementationHash = hashImplementationFiles();
  const transformDependencyVersions = {
    fastFlowTransform: getFastFlowTransformVersion(),
  };

  hasher.update(`granite-vitest-rn-cache:${MIRROR_CACHE_KEY_VERSION}`);
  hasher.update('\0');
  hasher.update(`fast-flow-transform:${transformDependencyVersions.fastFlowTransform}`);
  hasher.update('\0');
  hasher.update(`transform:${transformImplementationHash}`);
  hasher.update('\0');

  for (const packageRoot of packageRoots) {
    hasher.update(path.basename(packageRoot));
    hasher.update('\0');
    hashDirectoryContents(hasher, packageRoot);
  }

  return {
    cacheKey: hasher.digest('hex'),
    packageRoots,
    transformDependencyVersions,
    transformImplementationHash,
  };
}

function getDirectorySize(targetPath: string): number {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    return stat.size;
  }

  if (!stat.isDirectory()) {
    return 0;
  }

  return fs.readdirSync(targetPath, { withFileTypes: true }).reduce<number>((totalSize, entry) => {
    const entryPath = path.join(targetPath, entry.name);

    if (entry.isDirectory() || entry.isFile()) {
      return totalSize + getDirectorySize(entryPath);
    }

    return totalSize;
  }, 0);
}

function readMirrorCacheMetadata(entryRoot: string) {
  const metadataPath = getReactNativeMirrorMetadataPath(entryRoot);

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as MirrorCacheMetadata;
  } catch {
    return null;
  }
}

function writeMirrorCacheMetadata(entryRoot: string, metadata: MirrorCacheMetadata) {
  fs.writeFileSync(
    getReactNativeMirrorMetadataPath(entryRoot),
    JSON.stringify(metadata, null, 2),
  );
}

function markMirrorCacheEntryAccessed(entryRoot: string) {
  const metadata = readMirrorCacheMetadata(entryRoot);

  if (metadata == null) {
    return;
  }

  metadata.lastAccessedAt = new Date().toISOString();
  writeMirrorCacheMetadata(entryRoot, metadata);
}

function removeIfExists(targetPath: string) {
  fs.rmSync(targetPath, { force: true, recursive: true });
}

function withMirrorCacheGcLock(
  workspaceRoot: string,
  cacheDirectory: string | undefined,
  callback: () => void,
) {
  const cacheRoot = getReactNativeMirrorCacheRoot(workspaceRoot, cacheDirectory);
  const lockPath = path.join(cacheRoot, GRANITE_VITEST_RN_CACHE_GC_LOCK_FILENAME);

  ensureDirectory(cacheRoot);

  let lockHandle: number | null = null;

  try {
    lockHandle = fs.openSync(lockPath, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return;
    }

    throw error;
  }

  try {
    callback();
  } finally {
    if (lockHandle != null) {
      fs.closeSync(lockHandle);
      removeIfExists(lockPath);
    }
  }
}

function gcReactNativeMirrorCache(
  workspaceRoot: string,
  activeCacheKey: string,
  cacheDirectory?: string,
) {
  withMirrorCacheGcLock(workspaceRoot, cacheDirectory, () => {
    const entriesRoot = getReactNativeMirrorEntriesRoot(workspaceRoot, cacheDirectory);

    if (!fs.existsSync(entriesRoot)) {
      return;
    }

    const now = Date.now();
    const retainedEntries: Array<{
      cacheKey: string;
      entryRoot: string;
      lastAccessedAtMs: number;
      sizeBytes: number;
    }> = [];

    for (const entry of fs.readdirSync(entriesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryRoot = path.join(entriesRoot, entry.name);
      const isTemporaryEntry = entry.name.startsWith(GRANITE_VITEST_RN_CACHE_TMP_PREFIX);

      if (isTemporaryEntry) {
        const ageMs = now - fs.statSync(entryRoot).mtimeMs;

        if (ageMs > GRANITE_VITEST_RN_TEMP_ENTRY_MAX_AGE_MS) {
          removeIfExists(entryRoot);
        }

        continue;
      }

      if (entry.name === activeCacheKey) {
        const activeMetadata = readMirrorCacheMetadata(entryRoot);
        retainedEntries.push({
          cacheKey: entry.name,
          entryRoot,
          lastAccessedAtMs:
            activeMetadata == null ? now : Date.parse(activeMetadata.lastAccessedAt),
          sizeBytes:
            activeMetadata?.sizeBytes ?? getDirectorySize(getReactNativeMirrorPackagesRoot(entryRoot)),
        });
        continue;
      }

      const metadata = readMirrorCacheMetadata(entryRoot);
      const packagesRoot = getReactNativeMirrorPackagesRoot(entryRoot);

      if (metadata == null || !fs.existsSync(packagesRoot)) {
        removeIfExists(entryRoot);
        continue;
      }

      const lastAccessedAtMs = Date.parse(metadata.lastAccessedAt);
      if (Number.isNaN(lastAccessedAtMs) || now - lastAccessedAtMs > GRANITE_VITEST_RN_CACHE_MAX_AGE_MS) {
        removeIfExists(entryRoot);
        continue;
      }

      retainedEntries.push({
        cacheKey: entry.name,
        entryRoot,
        lastAccessedAtMs,
        sizeBytes: metadata.sizeBytes,
      });
    }

    let totalSizeBytes = retainedEntries.reduce((totalSize, entry) => totalSize + entry.sizeBytes, 0);

    for (const entry of retainedEntries
      .filter((cacheEntry) => cacheEntry.cacheKey !== activeCacheKey)
      .sort((left, right) => left.lastAccessedAtMs - right.lastAccessedAtMs)) {
      if (totalSizeBytes <= GRANITE_VITEST_RN_CACHE_MAX_SIZE_BYTES) {
        break;
      }

      removeIfExists(entry.entryRoot);
      totalSizeBytes -= entry.sizeBytes;
    }
  });
}

export function resolvePackageRoot(packageName: string, requireRoot: string) {
  const packageRequire = createRequire(path.join(requireRoot, 'package.json'));
  const packageJsonPath = packageRequire.resolve(`${packageName}/package.json`);

  return path.dirname(packageJsonPath);
}

export function resolveReactNativePackageRoots(workspaceRoot: string) {
  const reactNativeRoot = resolvePackageRoot('react-native', workspaceRoot);

  return [
    reactNativeRoot,
    ...getMirroredReactNativePackages(workspaceRoot).map(({ packageName, requireRoot }) =>
      resolvePackageRoot(packageName, requireRoot),
    ),
  ];
}

async function mirrorFile(
  sourcePath: string,
  destinationPath: string,
  packageRoots: readonly string[],
) {
  ensureDirectory(path.dirname(destinationPath));

  if (shouldTransformReactNativeFile(sourcePath, packageRoots)) {
    const source = fs.readFileSync(sourcePath, 'utf8');

    try {
      const transformed = await transformReactNativeSource(sourcePath, source);
      fs.writeFileSync(destinationPath, transformed);
      return;
    } catch {
      fs.writeFileSync(destinationPath, source);
      return;
    }
  }

  fs.copyFileSync(sourcePath, destinationPath);
}

async function mirrorTree(
  sourceRoot: string,
  destinationRoot: string,
  packageRoots: readonly string[],
) {
  const entries = fs.readdirSync(sourceRoot, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const destinationPath = path.join(destinationRoot, entry.name);

    if (entry.isDirectory()) {
      await mirrorTree(sourcePath, destinationPath, packageRoots);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    await mirrorFile(sourcePath, destinationPath, packageRoots);
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

async function mirrorResolvedPackage(
  packageName: string,
  requireRoot: string,
  destinationRoot: string,
  packageRoots: readonly string[],
) {
  const sourceRoot = resolvePackageRoot(packageName, requireRoot);
  const destinationPath = path.join(destinationRoot, ...packageName.split('/'));

  await mirrorTree(sourceRoot, destinationPath, packageRoots);
}

export async function buildReactNativeMirror(workspaceRoot: string, cacheDirectory?: string) {
  const cacheEntry = computeReactNativeMirrorCacheKey(workspaceRoot);
  const entryRoot = getReactNativeMirrorEntryRoot(workspaceRoot, cacheEntry.cacheKey, cacheDirectory);
  const packagesRoot = getReactNativeMirrorPackagesRoot(entryRoot);
  const metadataPath = getReactNativeMirrorMetadataPath(entryRoot);

  ensureDirectory(getReactNativeMirrorEntriesRoot(workspaceRoot, cacheDirectory));

  if (fs.existsSync(entryRoot) && (!fs.existsSync(packagesRoot) || !fs.existsSync(metadataPath))) {
    removeIfExists(entryRoot);
  }

  if (fs.existsSync(packagesRoot) && fs.existsSync(metadataPath)) {
    markMirrorCacheEntryAccessed(entryRoot);
    gcReactNativeMirrorCache(workspaceRoot, cacheEntry.cacheKey, cacheDirectory);
    return packagesRoot;
  }

  const temporaryEntryRoot = path.join(
    getReactNativeMirrorEntriesRoot(workspaceRoot, cacheDirectory),
    `${GRANITE_VITEST_RN_CACHE_TMP_PREFIX}${process.pid}-${Date.now()}-${cacheEntry.cacheKey}`,
  );
  const temporaryPackagesRoot = getReactNativeMirrorPackagesRoot(temporaryEntryRoot);

  removeIfExists(temporaryEntryRoot);
  ensureDirectory(temporaryPackagesRoot);

  try {
    await mirrorResolvedPackage('react-native', workspaceRoot, temporaryPackagesRoot, cacheEntry.packageRoots);

    for (const { packageName, requireRoot } of getMirroredReactNativePackages(workspaceRoot)) {
      await mirrorResolvedPackage(packageName, requireRoot, temporaryPackagesRoot, cacheEntry.packageRoots);
    }

    synthesizeDefaultPlatformFiles(temporaryPackagesRoot);

    const now = new Date().toISOString();
    writeMirrorCacheMetadata(temporaryEntryRoot, {
      cacheKey: cacheEntry.cacheKey,
      createdAt: now,
      lastAccessedAt: now,
      packageRoots: cacheEntry.packageRoots,
      sizeBytes: getDirectorySize(temporaryPackagesRoot),
      transformDependencyVersions: cacheEntry.transformDependencyVersions,
      transformImplementationHash: cacheEntry.transformImplementationHash,
    });

    try {
      fs.renameSync(temporaryEntryRoot, entryRoot);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;

      if (errorCode !== 'EEXIST' && errorCode !== 'ENOTEMPTY') {
        throw error;
      }
    }
  } finally {
    removeIfExists(temporaryEntryRoot);
  }

  if (fs.existsSync(packagesRoot) && fs.existsSync(metadataPath)) {
    markMirrorCacheEntryAccessed(entryRoot);
    gcReactNativeMirrorCache(workspaceRoot, cacheEntry.cacheKey, cacheDirectory);
    return packagesRoot;
  }

  throw new Error(`Failed to materialize React Native mirror cache at ${entryRoot}`);
}
