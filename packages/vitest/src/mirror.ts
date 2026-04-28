import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REACT_NATIVE_ASSET_EXTENSIONS } from './assets';
import { shouldTransformReactNativeFile, transformReactNativeSource } from './transpile';

export const DEFAULT_PLATFORM = 'ios';
export const GRANITE_VITEST_RN_CACHE_DIRECTORY = 'vitest-react-native-cache';
export const GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY = 'entries';
export const GRANITE_VITEST_RN_OBJECTS_DIRECTORY = 'objects';
export const GRANITE_VITEST_RN_MANIFEST_FILENAME = 'manifest.json';
export const GRANITE_VITEST_RN_PACKAGES_DIRECTORY = 'packages';
export const REACT_NATIVE_PLATFORMS = ['android', 'ios', 'native'] as const;

const GRANITE_VITEST_RN_CACHE_GC_LOCK_FILENAME = '.gc.lock';
const GRANITE_VITEST_RN_CACHE_METADATA_FILENAME = 'meta.json';
const GRANITE_VITEST_RN_CACHE_TMP_PREFIX = '.tmp-';
const GRANITE_VITEST_RN_TEMP_ENTRY_MAX_AGE_MS = 60 * 60 * 1000;
const DEFAULT_VITEST_CACHE_DIRECTORY = '.vitest';
const MIRROR_CACHE_KEY_VERSION = 'v2-flat';
const PLATFORM_EXTENSION_SUFFIXES = ['tsx', 'ts', 'jsx', 'js'] as const;
const RESOLVE_EXTENSIONS = [
  DEFAULT_PLATFORM,
  'native',
  ...REACT_NATIVE_PLATFORMS.filter((platform) => platform !== DEFAULT_PLATFORM && platform !== 'native'),
].flatMap((platform) => PLATFORM_EXTENSION_SUFFIXES.map((extension) => `.${platform}.${extension}`));
const FALLBACK_EXTENSIONS = [
  ...RESOLVE_EXTENSIONS,
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.json',
  ...REACT_NATIVE_ASSET_EXTENSIONS.map((extension) => `.${extension}`),
] as const;

type MirrorCacheMetadata = {
  cacheKey: string;
  createdAt: string;
  lastAccessedAt: string;
  packageRoots: string[];
  sizeBytes: number;
  transformDependencyVersions: {
    flowRemoveTypes: string;
  };
  transformImplementationHash: string;
};

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  main?: string;
  module?: string;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  ['react-native']?: string;
};

type MirroredReactNativePackage = {
  packageName: string;
  requireRoot: string;
};

type ReactNativePackageEntry = {
  packageName: string;
  packageRoot: string;
  requireRoot: string;
};

export type ReactNativeTransformCacheManifest = {
  cacheKey: string;
  createdAt: string;
  lastAccessedAt: string;
  objectsRoot: string;
  packageRoots: string[];
  packages: ReactNativePackageEntry[];
  sourceToObject: Record<string, string>;
  objectToSource: Record<string, string>;
  transformDependencyVersions: {
    flowRemoveTypes: string;
  };
  transformImplementationHash: string;
};

export type ReactNativeTransformCache = {
  entryRoot: string;
  manifest: ReactNativeTransformCacheManifest;
  manifestPath: string;
  objectsRoot: string;
};

export type ReactNativeResolvedModule = {
  objectPath: string;
  sourcePath: string;
};

const currentMirrorModulePath = fs.realpathSync(fileURLToPath(import.meta.url));
const currentMirrorModuleDirectory = path.dirname(currentMirrorModulePath);

function normalizePath(filename: string) {
  return path.resolve(filename.replace(/[?#].*$/, ''));
}

function getFlowRemoveTypesVersion() {
  const packageRequire = createRequire(import.meta.url);
  const flowRemoveTypesPackageJsonPath = packageRequire.resolve('flow-remove-types/package.json');
  const flowRemoveTypesPackageJson = JSON.parse(fs.readFileSync(flowRemoveTypesPackageJsonPath, 'utf8')) as {
    version?: string;
  };

  return flowRemoveTypesPackageJson.version ?? 'unknown';
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

function hashDirectoryContents(
  hasher: ReturnType<typeof createHash>,
  rootPath: string,
  currentPath: string = rootPath
) {
  const entries = fs
    .readdirSync(currentPath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      hashDirectoryContents(hasher, rootPath, entryPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    hasher.update(path.relative(rootPath, entryPath));
    hasher.update('\0');
    hasher.update(fs.readFileSync(entryPath));
    hasher.update('\0');
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
  reactNativePackageManifest: PackageManifest
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
  const workspacePackageManifest = JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8')
  ) as PackageManifest;
  const reactNativePackageManifest = JSON.parse(
    fs.readFileSync(path.join(reactNativeRoot, 'package.json'), 'utf8')
  ) as PackageManifest;
  const workspaceDependencyNames = new Set(getPackageManifestDependencyNames(workspacePackageManifest));

  return collectMirroredReactNativePackageNames(workspacePackageManifest, reactNativePackageManifest).map(
    (packageName) => ({
      packageName,
      requireRoot: workspaceDependencyNames.has(packageName) ? workspaceRoot : reactNativeRoot,
    })
  );
}

function getReactNativePackageEntries(workspaceRoot: string): ReactNativePackageEntry[] {
  return [
    {
      packageName: 'react-native',
      packageRoot: resolvePackageRoot('react-native', workspaceRoot),
      requireRoot: workspaceRoot,
    },
    ...getMirroredReactNativePackages(workspaceRoot).map(({ packageName, requireRoot }) => ({
      packageName,
      packageRoot: resolvePackageRoot(packageName, requireRoot),
      requireRoot,
    })),
  ];
}

function computeReactNativeTransformCacheKey(workspaceRoot: string) {
  const hasher = createHash('sha256');
  const packageRoots = resolveReactNativePackageRoots(workspaceRoot).sort();
  const transformImplementationHash = hashImplementationFiles();
  const transformDependencyVersions = {
    flowRemoveTypes: getFlowRemoveTypesVersion(),
  };

  hasher.update(`granite-vitest-rn-cache:${MIRROR_CACHE_KEY_VERSION}`);
  hasher.update('\0');
  hasher.update(`flow-remove-types:${transformDependencyVersions.flowRemoveTypes}`);
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
  const metadataPath = path.join(entryRoot, GRANITE_VITEST_RN_CACHE_METADATA_FILENAME);

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as MirrorCacheMetadata;
  } catch {
    return null;
  }
}

function gcReactNativeMirrorCache(
  workspaceRoot: string,
  activeCacheKey: string,
  resolvedCacheDir: string = path.join(workspaceRoot, DEFAULT_VITEST_CACHE_DIRECTORY)
) {
  void gcReactNativeMirrorCacheAsync(activeCacheKey, resolvedCacheDir).catch(() => undefined);
}

async function gcReactNativeMirrorCacheAsync(activeCacheKey: string, resolvedCacheDir: string) {
  const cacheRoot = path.join(resolvedCacheDir, GRANITE_VITEST_RN_CACHE_DIRECTORY);
  const lockPath = path.join(cacheRoot, GRANITE_VITEST_RN_CACHE_GC_LOCK_FILENAME);

  await fs.promises.mkdir(cacheRoot, { recursive: true });

  let lockHandle: fs.promises.FileHandle | null = null;

  try {
    lockHandle = await fs.promises.open(lockPath, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return;
    }

    throw error;
  }

  try {
    const entriesRoot = path.join(
      resolvedCacheDir,
      GRANITE_VITEST_RN_CACHE_DIRECTORY,
      GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY
    );

    const entriesRootExists = await fs.promises
      .access(entriesRoot)
      .then(() => true)
      .catch(() => false);

    if (!entriesRootExists) {
      return;
    }

    const now = Date.now();
    const removeEntryPromises: Array<Promise<unknown>> = [];

    for (const entry of await fs.promises.readdir(entriesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryRoot = path.join(entriesRoot, entry.name);
      const isTemporaryEntry = entry.name.startsWith(GRANITE_VITEST_RN_CACHE_TMP_PREFIX);

      if (isTemporaryEntry) {
        const stat = await fs.promises.stat(entryRoot).catch(() => null);
        const ageMs = stat == null ? 0 : now - stat.mtimeMs;

        if (ageMs > GRANITE_VITEST_RN_TEMP_ENTRY_MAX_AGE_MS) {
          removeEntryPromises.push(fs.promises.rm(entryRoot, { force: true, recursive: true }));
        }

        continue;
      }

      if (entry.name === activeCacheKey) {
        continue;
      }

      removeEntryPromises.push(fs.promises.rm(entryRoot, { force: true, recursive: true }));
    }

    await Promise.allSettled(removeEntryPromises);
  } catch {
    /* noop */
  } finally {
    if (lockHandle != null) {
      await lockHandle.close().catch(() => undefined);
      await fs.promises.rm(lockPath, { force: true, recursive: true }).catch(() => undefined);
    }
  }
}

export function resolvePackageRoot(packageName: string, requireRoot: string) {
  const packageRequire = createRequire(path.join(requireRoot, 'package.json'));
  const packageJsonPath = packageRequire.resolve(`${packageName}/package.json`);

  return path.dirname(packageJsonPath);
}

export function resolveReactNativePackageRoots(workspaceRoot: string) {
  return getReactNativePackageEntries(workspaceRoot).map(({ packageRoot }) => packageRoot);
}

function readPackageManifest(packageRoot: string) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as PackageManifest;
}

function findPackageForRequest(request: string, manifest: ReactNativeTransformCacheManifest) {
  return manifest.packages
    .sort((left, right) => right.packageName.length - left.packageName.length)
    .find(({ packageName }) => request === packageName || request.startsWith(`${packageName}/`));
}

function getPackageSubpath(request: string, packageName: string) {
  if (request === packageName) {
    return null;
  }

  return request.slice(packageName.length + 1);
}

function getObjectForSourcePath(
  sourcePath: string,
  manifest: ReactNativeTransformCacheManifest
): ReactNativeResolvedModule | null {
  const normalizedSourcePath = normalizePath(sourcePath);
  const objectPath = manifest.sourceToObject[normalizedSourcePath];

  if (objectPath == null) {
    return null;
  }

  return {
    objectPath,
    sourcePath: normalizedSourcePath,
  };
}

function resolvePackageEntrySourcePath(
  packageEntry: ReactNativePackageEntry,
  manifest: ReactNativeTransformCacheManifest
): ReactNativeResolvedModule | null {
  const packageManifest = readPackageManifest(packageEntry.packageRoot);
  const entryPath =
    packageEntry.packageName === 'react-native'
      ? 'index.js'
      : (packageManifest['react-native'] ?? packageManifest.module ?? packageManifest.main ?? 'index.js');

  if (typeof entryPath === 'string') {
    return resolveSourcePathCandidate(path.join(packageEntry.packageRoot, entryPath), manifest);
  }

  return resolveSourcePathCandidate(path.join(packageEntry.packageRoot, 'index'), manifest);
}

function resolveSourcePathCandidate(
  candidatePath: string,
  manifest: ReactNativeTransformCacheManifest
): ReactNativeResolvedModule | null {
  const normalizedCandidatePath = normalizePath(candidatePath);

  if (fs.existsSync(normalizedCandidatePath)) {
    const stat = fs.statSync(normalizedCandidatePath);

    if (stat.isFile()) {
      return getObjectForSourcePath(normalizedCandidatePath, manifest);
    }

    if (stat.isDirectory()) {
      const packageJsonPath = path.join(normalizedCandidatePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageManifest = readPackageManifest(normalizedCandidatePath);
        const entryPath =
          packageManifest['react-native'] ?? packageManifest.module ?? packageManifest.main ?? 'index.js';

        if (typeof entryPath === 'string') {
          const resolvedEntry = resolveSourcePathCandidate(path.join(normalizedCandidatePath, entryPath), manifest);
          if (resolvedEntry != null) {
            return resolvedEntry;
          }
        }
      }

      return resolveSourcePathCandidate(path.join(normalizedCandidatePath, 'index'), manifest);
    }
  }

  if (path.extname(normalizedCandidatePath).length > 0) {
    return null;
  }

  for (const extension of FALLBACK_EXTENSIONS) {
    const resolved = getObjectForSourcePath(`${normalizedCandidatePath}${extension}`, manifest);
    if (resolved != null) {
      return resolved;
    }
  }

  return null;
}

export function resolveReactNativeModuleFromManifest(
  request: string,
  importer: string | undefined,
  manifest: ReactNativeTransformCacheManifest
): ReactNativeResolvedModule | null {
  if (request.startsWith('.') && importer != null) {
    const importerSourcePath = manifest.objectToSource[normalizePath(importer)];

    if (importerSourcePath == null) {
      return null;
    }

    return resolveSourcePathCandidate(path.resolve(path.dirname(importerSourcePath), request), manifest);
  }

  const packageEntry = findPackageForRequest(request, manifest);
  if (packageEntry == null) {
    return null;
  }

  const subpath = getPackageSubpath(request, packageEntry.packageName);
  if (subpath == null) {
    return resolvePackageEntrySourcePath(packageEntry, manifest);
  }

  return resolveSourcePathCandidate(path.join(packageEntry.packageRoot, subpath), manifest);
}

async function writeObjectFile(
  sourcePath: string,
  objectsRoot: string,
  packageRoots: readonly string[],
  manifest: ReactNativeTransformCacheManifest
) {
  const normalizedSourcePath = normalizePath(sourcePath);
  const sourceBuffer = fs.readFileSync(normalizedSourcePath);
  const extension = path.extname(normalizedSourcePath) || '.js';
  let outputBuffer = sourceBuffer;

  if (shouldTransformReactNativeFile(normalizedSourcePath, packageRoots)) {
    try {
      const transformed = await transformReactNativeSource(normalizedSourcePath, sourceBuffer.toString('utf8'));
      outputBuffer = Buffer.from(transformed);
    } catch {
      outputBuffer = sourceBuffer;
    }
  }

  const objectHash = createHash('sha256').update(normalizedSourcePath).update('\0').update(outputBuffer).digest('hex');
  const objectPath = path.join(objectsRoot, `${objectHash}${extension}`);

  if (!fs.existsSync(objectPath)) {
    fs.writeFileSync(objectPath, outputBuffer);
  }

  manifest.sourceToObject[normalizedSourcePath] = objectPath;
  manifest.objectToSource[objectPath] = normalizedSourcePath;
}

async function writePackageTreeObjects(
  sourceRoot: string,
  objectsRoot: string,
  packageRoots: readonly string[],
  manifest: ReactNativeTransformCacheManifest
) {
  const entries = fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const sourcePath = path.join(sourceRoot, entry.name);

    if (entry.isDirectory()) {
      await writePackageTreeObjects(sourcePath, objectsRoot, packageRoots, manifest);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    await writeObjectFile(sourcePath, objectsRoot, packageRoots, manifest);
  }
}

function readTransformCacheManifest(manifestPath: string) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ReactNativeTransformCacheManifest;
}

export function loadReactNativeTransformCacheManifest(manifestPath: string) {
  return readTransformCacheManifest(manifestPath);
}

export async function buildReactNativeTransformCache(
  workspaceRoot: string,
  resolvedCacheDir: string = path.join(workspaceRoot, DEFAULT_VITEST_CACHE_DIRECTORY)
): Promise<ReactNativeTransformCache> {
  const cacheEntry = computeReactNativeTransformCacheKey(workspaceRoot);
  const entriesRoot = path.join(
    resolvedCacheDir,
    GRANITE_VITEST_RN_CACHE_DIRECTORY,
    GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY
  );
  const entryRoot = path.join(entriesRoot, cacheEntry.cacheKey);
  const objectsRoot = path.join(entryRoot, GRANITE_VITEST_RN_OBJECTS_DIRECTORY);
  const manifestPath = path.join(entryRoot, GRANITE_VITEST_RN_MANIFEST_FILENAME);
  const metadataPath = path.join(entryRoot, GRANITE_VITEST_RN_CACHE_METADATA_FILENAME);

  fs.mkdirSync(entriesRoot, { recursive: true });

  if (fs.existsSync(entryRoot) && (!fs.existsSync(objectsRoot) || !fs.existsSync(manifestPath))) {
    fs.rmSync(entryRoot, { force: true, recursive: true });
  }

  gcReactNativeMirrorCache(workspaceRoot, cacheEntry.cacheKey, resolvedCacheDir);

  if (fs.existsSync(objectsRoot) && fs.existsSync(manifestPath) && fs.existsSync(metadataPath)) {
    const manifest = readTransformCacheManifest(manifestPath);
    const metadata = readMirrorCacheMetadata(entryRoot);
    const lastAccessedAt = new Date().toISOString();

    manifest.lastAccessedAt = lastAccessedAt;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    if (metadata != null) {
      metadata.lastAccessedAt = lastAccessedAt;
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    return {
      entryRoot,
      manifest,
      manifestPath,
      objectsRoot,
    };
  }

  const temporaryEntryRoot = path.join(
    entriesRoot,
    `${GRANITE_VITEST_RN_CACHE_TMP_PREFIX}${process.pid}-${Date.now()}-${cacheEntry.cacheKey}`
  );
  const temporaryObjectsRoot = path.join(temporaryEntryRoot, GRANITE_VITEST_RN_OBJECTS_DIRECTORY);
  const temporaryManifestPath = path.join(temporaryEntryRoot, GRANITE_VITEST_RN_MANIFEST_FILENAME);
  const temporaryMetadataPath = path.join(temporaryEntryRoot, GRANITE_VITEST_RN_CACHE_METADATA_FILENAME);
  const now = new Date().toISOString();
  const packages = getReactNativePackageEntries(workspaceRoot);
  const manifest: ReactNativeTransformCacheManifest = {
    cacheKey: cacheEntry.cacheKey,
    createdAt: now,
    lastAccessedAt: now,
    objectsRoot,
    packageRoots: cacheEntry.packageRoots,
    packages,
    sourceToObject: {},
    objectToSource: {},
    transformDependencyVersions: cacheEntry.transformDependencyVersions,
    transformImplementationHash: cacheEntry.transformImplementationHash,
  };

  fs.rmSync(temporaryEntryRoot, { force: true, recursive: true });
  fs.mkdirSync(temporaryObjectsRoot, { recursive: true });

  try {
    const temporaryManifest = {
      ...manifest,
      objectsRoot: temporaryObjectsRoot,
    };

    for (const { packageRoot } of packages) {
      await writePackageTreeObjects(packageRoot, temporaryObjectsRoot, cacheEntry.packageRoots, temporaryManifest);
    }

    const finalizedManifest = {
      ...temporaryManifest,
      objectsRoot,
      sourceToObject: Object.fromEntries(
        Object.entries(temporaryManifest.sourceToObject).map(([sourcePath, objectPath]) => [
          sourcePath,
          path.join(objectsRoot, path.basename(objectPath)),
        ])
      ),
      objectToSource: Object.fromEntries(
        Object.entries(temporaryManifest.objectToSource).map(([objectPath, sourcePath]) => [
          path.join(objectsRoot, path.basename(objectPath)),
          sourcePath,
        ])
      ),
    };

    fs.writeFileSync(temporaryManifestPath, JSON.stringify(finalizedManifest, null, 2));
    fs.writeFileSync(
      temporaryMetadataPath,
      JSON.stringify(
        {
          cacheKey: cacheEntry.cacheKey,
          createdAt: now,
          lastAccessedAt: now,
          packageRoots: cacheEntry.packageRoots,
          sizeBytes: getDirectorySize(temporaryObjectsRoot),
          transformDependencyVersions: cacheEntry.transformDependencyVersions,
          transformImplementationHash: cacheEntry.transformImplementationHash,
        },
        null,
        2
      )
    );

    try {
      fs.renameSync(temporaryEntryRoot, entryRoot);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;

      if (errorCode !== 'EEXIST' && errorCode !== 'ENOTEMPTY') {
        throw error;
      }
    }
  } finally {
    fs.rmSync(temporaryEntryRoot, { force: true, recursive: true });
  }

  if (fs.existsSync(objectsRoot) && fs.existsSync(manifestPath) && fs.existsSync(metadataPath)) {
    const manifest = readTransformCacheManifest(manifestPath);
    const metadata = readMirrorCacheMetadata(entryRoot);
    const lastAccessedAt = new Date().toISOString();

    manifest.lastAccessedAt = lastAccessedAt;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    if (metadata != null) {
      metadata.lastAccessedAt = lastAccessedAt;
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    gcReactNativeMirrorCache(workspaceRoot, cacheEntry.cacheKey, resolvedCacheDir);
    return {
      entryRoot,
      manifest,
      manifestPath,
      objectsRoot,
    };
  }

  throw new Error(`Failed to materialize React Native transform cache at ${entryRoot}`);
}

export async function buildReactNativeMirror(
  workspaceRoot: string,
  resolvedCacheDir: string = path.join(workspaceRoot, DEFAULT_VITEST_CACHE_DIRECTORY)
) {
  const cache = await buildReactNativeTransformCache(workspaceRoot, resolvedCacheDir);
  return cache.objectsRoot;
}
