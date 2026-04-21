import { createRequire } from 'node:module';
import path from 'node:path';

export const REACT_NATIVE_TRANSFORM_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'] as const;
export const REACT_NATIVE_TRANSFORM_ALLOWLIST = [
  'react-native',
  'jest-react-native',
  '@react-native',
  '@react-native-community',
] as const;

type FastFlowTransformBinding = {
  transform: (input: {
    filename: string;
    code: string;
    dialect: 'flow' | 'flow-detect' | 'flow-unambiguous';
    format: 'compact' | 'preserve' | 'pretty';
    comments: boolean;
    reactRuntimeTarget: '18' | '19';
    sourcemap: boolean;
  }) => {
    ok: boolean;
    code?: string;
    errorMessage?: string;
    errorLine?: number;
    errorColumn?: number;
  };
};

const require = createRequire(import.meta.url);
const fastFlowTransformEntryPath = require.resolve('fast-flow-transform');
const fastFlowTransformPackageRoot = path.dirname(path.dirname(fastFlowTransformEntryPath));
const fastFlowTransformBinding = require(
  path.join(fastFlowTransformPackageRoot, 'binding', 'bindings.cjs'),
) as FastFlowTransformBinding;

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

export function transformReactNativeSource(sourcePath: string, source: string) {
  const transformed = fastFlowTransformBinding.transform({
    filename: sourcePath,
    code: source,
    dialect: 'flow-detect',
    format: 'compact',
    comments: false,
    reactRuntimeTarget: '19',
    sourcemap: false,
  });

  if (!transformed.ok || transformed.code == null) {
    const location =
      transformed.errorLine != null && transformed.errorColumn != null
        ? ` (${sourcePath}:${String(transformed.errorLine)}:${String(transformed.errorColumn)})`
        : '';
    const message = transformed.errorMessage ?? 'Unknown fast-flow-transform error';
    throw new Error(`fast-flow-transform failed${location}: ${message}`);
  }

  return transformed.code;
}
