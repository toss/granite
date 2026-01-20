import fs from 'fs';
import path from 'path';
import { getPackageRoot } from '@granite-js/utils';

/**
 * Returns the Hermes OS binary folder name for the current platform.
 */
function getHermesOSBin(): string {
  switch (process.platform) {
    case 'win32':
      return 'win64-bin';
    case 'darwin':
      return 'osx-bin';
    default:
      return 'linux64-bin';
  }
}

/**
 * Returns the Hermes executable name for the current platform.
 */
function getHermesOSExe(): string {
  const hermesExecutableName = 'hermesc';
  return process.platform === 'win32' ? `${hermesExecutableName}.exe` : hermesExecutableName;
}

function getReactNativePackagePath(root: string): string {
  try {
    return path.dirname(
      require.resolve('react-native/package.json', {
        paths: [root],
      })
    );
  } catch {
    return path.join('node_modules', 'react-native');
  }
}

function getHermesCompilerPackagePath(reactNativePath: string): string | null {
  try {
    return path.dirname(
      require.resolve('hermes-compiler/package.json', {
        paths: [reactNativePath],
      })
    );
  } catch {
    return null;
  }
}

function getPackagePathFromRoot(root: string, pkgName: string): string | null {
  try {
    return path.dirname(
      require.resolve(`${pkgName}/package.json`, {
        paths: [root],
      })
    );
  } catch {
    return null;
  }
}

function fileExists(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

export function resolveHermesBinaryPath() {
  const root = getPackageRoot();
  const reactNativePath = getReactNativePackagePath(root);

  // 1) RN 0.83+: prefer hermes-compiler package
  const hermesCompilerPath = getHermesCompilerPackagePath(reactNativePath);
  if (hermesCompilerPath) {
    const engine = path.join(hermesCompilerPath,"hermesc", getHermesOSBin(), getHermesOSExe());
    if (fileExists(engine)) {
      return engine;
    }
  }

  // 2) RN 0.69+: bundled hermesc inside react-native
  const bundledHermesEngine = path.join(reactNativePath, 'sdks', 'hermesc', getHermesOSBin(), getHermesOSExe());
  if (fileExists(bundledHermesEngine)) {
    return bundledHermesEngine;
  }

  // 3) hermes-engine package
  const hermesEnginePkg = getPackagePathFromRoot(root, 'hermes-engine');
  if (hermesEnginePkg) {
    const engine = path.join(hermesEnginePkg, getHermesOSBin(), getHermesOSExe());
    if (fileExists(engine)) {
      return engine;
    }
  }

  // 4) hermesvm package (final fallback)
  const hermesVmPkg = getPackagePathFromRoot(root, 'hermesvm');
  if (hermesVmPkg) {
    const engine = path.join(hermesVmPkg, getHermesOSBin(), 'hermes');
    if (fileExists(engine)) {
      return engine;
    }
  }

  // Fallback: return legacy bundled path to keep previous behavior
  return path.join(reactNativePath, 'sdks', 'hermesc', getHermesOSBin(), getHermesOSExe());
}
