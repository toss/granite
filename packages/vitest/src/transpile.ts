import path from 'node:path';
import flowRemoveTypes from 'flow-remove-types';

export const REACT_NATIVE_TRANSFORM_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'] as const;
export const REACT_NATIVE_TRANSFORM_ALLOWLIST = [
  'react-native',
  'jest-react-native',
  '@react-native',
  '@react-native-community',
] as const;

function normalizePath(filename: string) {
  return filename.replace(/\\/g, '/');
}

function isWithinPackageRoots(filename: string, packageRoots: readonly string[]) {
  const normalizedFilename = normalizePath(path.resolve(filename));

  return packageRoots.some((packageRoot) => {
    const normalizedPackageRoot = normalizePath(path.resolve(packageRoot));

    return (
      normalizedFilename === normalizedPackageRoot ||
      normalizedFilename.startsWith(`${normalizedPackageRoot}/`)
    );
  });
}

export function shouldTransformReactNativeFile(
  filename: string,
  packageRoots: readonly string[] = [],
) {
  const normalized = normalizePath(filename);
  const isReactNativeSource =
    packageRoots.length > 0
      ? isWithinPackageRoots(normalized, packageRoots)
      : normalized.includes('/react-native/') || normalized.includes('/@react-native/');

  return (
    /\.(?:js|jsx|ts|tsx)$/.test(normalized) &&
    !normalized.includes('/Renderer/implementations/') &&
    isReactNativeSource
  );
}

export function shouldInlineReactNativeDependency(
  filename: string,
  packageRoots: readonly string[] = [],
) {
  const normalized = normalizePath(filename);

  if (packageRoots.length > 0) {
    return isWithinPackageRoots(normalized, packageRoots);
  }

  return REACT_NATIVE_TRANSFORM_ALLOWLIST.some((allowlistEntry) =>
    normalized.includes(`/${allowlistEntry}/`),
  );
}

export async function transformReactNativeSource(_sourcePath: string, source: string) {
  return flowRemoveTypes(source, {
    all: true,
    pretty: true,
    removeEmptyImports: true,
  }).toString();
}
