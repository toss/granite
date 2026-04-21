import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PLATFORM,
  buildReactNativeMirror,
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  GRANITE_VITEST_RN_PACKAGES_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ROOT_ENV,
  REACT_NATIVE_PLATFORMS,
  resolvePackageRoot,
  resolveReactNativePackageRoots,
  synthesizeDefaultPlatformFiles,
} from './mirror';
import {
  REACT_NATIVE_TRANSFORM_ALLOWLIST,
  REACT_NATIVE_TRANSFORM_EXTENSIONS,
  shouldInlineReactNativeDependency,
  shouldTransformReactNativeFile,
} from './transpile';
import {
  isVitestVersionAtLeast,
  resolveInstalledVitestVersion,
  VITEST_VITE_8_SUPPORT_VERSION,
} from './vitestVersion';

export const REACT_NATIVE_RESOLVE_EXTENSIONS = [
  '.ios.tsx',
  '.ios.ts',
  '.ios.jsx',
  '.ios.js',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.json',
] as const;
export const REACT_NATIVE_EXPORT_CONDITIONS = ['require', 'react-native'] as const;
export const JEST_LIKE_TEST_PATTERNS = [
  '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
  '**/__tests__/**/*.spec.{js,jsx,ts,tsx}',
  '**/?(*.)test.{js,jsx,ts,tsx}',
  '**/?(*.)spec.{js,jsx,ts,tsx}',
] as const;

export interface ReactNativePluginOptions {
  workspaceRoot?: string;
}

type EsbuildTransformConfig = {
  esbuild: {
    jsx: 'automatic';
    jsxImportSource: 'react';
  };
  oxc?: never;
};

type OxcTransformConfig = {
  oxc: {
    jsx: {
      runtime: 'automatic';
      importSource: 'react';
    };
  };
  esbuild?: never;
};

type ReactNativeTransformConfig = EsbuildTransformConfig | OxcTransformConfig;

type ReactNativePlugin = {
  config: () => ReactNativeTransformConfig & {
      resolve: {
        alias: Array<{ find: RegExp; replacement: string }>;
        conditions: string[];
        extensions: string[];
      };
      test: {
        environment: 'node';
        globals: true;
        include: string[];
        setupFiles: string[];
      };
    };
  name: string;
};

const currentFilePath = fs.realpathSync(fileURLToPath(import.meta.url));
const currentDirectory = path.dirname(currentFilePath);

function getSetupFileExtension() {
  const extension = path.extname(currentFilePath);

  if (extension === '.ts' || extension === '.mts') {
    return '.ts';
  }

  return '.js';
}

export function resolveReactNativeSetupFiles() {
  const extension = getSetupFileExtension();

  return [
    path.join(currentDirectory, `reactNativeRuntime${extension}`),
    path.join(currentDirectory, `setup${extension}`),
  ];
}

export function getVitestJsxTransformConfig(vitestVersion: string | null): ReactNativeTransformConfig {
  if (
    vitestVersion != null &&
    isVitestVersionAtLeast(vitestVersion, VITEST_VITE_8_SUPPORT_VERSION)
  ) {
    return {
      oxc: {
        jsx: {
          runtime: 'automatic',
          importSource: 'react',
        },
      },
    };
  }

  return {
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
  };
}

export function reactNative(options: ReactNativePluginOptions = {}): ReactNativePlugin {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();

  return {
    name: 'granite-react-native',
    config() {
      const reactNativeMirrorRoot = buildReactNativeMirror(workspaceRoot);
      const vitestVersion = resolveInstalledVitestVersion(workspaceRoot);
      process.env[GRANITE_VITEST_RN_CACHE_ROOT_ENV] = reactNativeMirrorRoot;

      return {
        ...getVitestJsxTransformConfig(vitestVersion),
        resolve: {
          alias: [
            {
              find: /^react-native$/,
              replacement: path.join(reactNativeMirrorRoot, 'react-native', 'index.js'),
            },
            {
              find: /^react-native\/(.*)$/,
              replacement: path.join(reactNativeMirrorRoot, 'react-native', '$1'),
            },
            {
              find: /^@react-native\/(.*)$/,
              replacement: path.join(reactNativeMirrorRoot, '@react-native', '$1'),
            },
          ],
          conditions: [...REACT_NATIVE_EXPORT_CONDITIONS],
          extensions: [...REACT_NATIVE_RESOLVE_EXTENSIONS],
        },
        test: {
          environment: 'node',
          globals: true,
          include: [...JEST_LIKE_TEST_PATTERNS],
          setupFiles: resolveReactNativeSetupFiles(),
        },
      };
    },
  };
}

export {
  DEFAULT_PLATFORM,
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  GRANITE_VITEST_RN_PACKAGES_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ROOT_ENV,
  REACT_NATIVE_PLATFORMS,
  REACT_NATIVE_TRANSFORM_ALLOWLIST,
  REACT_NATIVE_TRANSFORM_EXTENSIONS,
  buildReactNativeMirror,
  resolvePackageRoot,
  resolveReactNativePackageRoots,
  synthesizeDefaultPlatformFiles,
  shouldInlineReactNativeDependency,
  shouldTransformReactNativeFile,
};
