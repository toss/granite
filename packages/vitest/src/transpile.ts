import path from 'node:path';
import esbuild from 'esbuild';
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

function getEsbuildLoader(filename: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case '.js':
      return 'jsx';
    case '.jsx':
      return 'jsx';
    case '.ts':
      return 'ts';
    case '.tsx':
      return 'tsx';
    default:
      return 'js';
  }
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

export function transformReactNativeSource(sourcePath: string, source: string) {
  const stripped = flowRemoveTypes(source, { all: true }).toString();
  const transformed = esbuild.transformSync(stripped, {
    format: 'cjs',
    loader: getEsbuildLoader(sourcePath),
    platform: 'node',
    sourcefile: sourcePath,
  });

  return transformed.code;
}
