import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import killPort from 'kill-port';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import waitPort from 'wait-port';
import { getYarnWorkspaces, findWorkspacePath } from 'workspace-tools';
import type { AppType } from '../appTypes';
import type { ToolType } from '../toolTypes';
import { createTmpDir, TmpDirManager } from './createTmpDir';

const noop = () => {};

const YARN_VERSION = '4.9.1';
const YARN_CONFIGS: Record<string, string | string[]> = {
  enableImmutableInstalls: JSON.stringify(false),
  packageExtensions: [
    '--json',
    JSON.stringify({
      '@typescript-eslint/type-utils@^8': {
        dependencies: {
          '@typescript-eslint/types': '^8',
        },
      },
      'react-native-svg@*': {
        dependencies: {
          buffer: '^6',
        },
      },
    }),
  ],
};

// additional package dependencies included in the sample project of `create-granite-app`
const ADDITIONAL_PACKAGE_NAMES = [
  '@granite-js/react-native',
  '@granite-js/native',
  '@granite-js/plugin-router',
  '@granite-js/plugin-hermes',
  '@granite-js/plugin-micro-frontend',
  'babel-preset-granite',
];

const rootDir = path.resolve(import.meta.dirname, '..', '..', '..', '..');

const createPackageJsonSnapshots = async () => {
  const { stdout } = await execa('git', ['ls-files', 'packages/*/package.json'], { cwd: rootDir });
  const packageJsonPaths = stdout.split('\n').filter(Boolean);

  return Promise.all(
    packageJsonPaths.map(async (filePath) => ({
      filePath,
      content: await fs.readFile(path.join(rootDir, filePath), 'utf8'),
    }))
  );
};

const restorePackageJsonSnapshots = async (snapshots: Awaited<ReturnType<typeof createPackageJsonSnapshots>>) => {
  await Promise.all(snapshots.map(({ filePath, content }) => fs.writeFile(path.join(rootDir, filePath), content)));
};

beforeAll(async () => {
  console.log('\n\n👉 Packing...');

  const packageJsonSnapshots = await createPackageJsonSnapshots();
  try {
    await execa(
      'yarn',
      ['tsx', '.scripts/linked-pack.ts', 'create-granite-app', '--packages', ...ADDITIONAL_PACKAGE_NAMES],
      { cwd: rootDir }
    );

    console.log('✅ Packing completed successfully');
  } finally {
    await restorePackageJsonSnapshots(packageJsonSnapshots);
  }
});

const lintScriptMap: Record<ToolType, string> = {
  biome: 'biome check',
  'eslint-prettier': 'eslint .',
};

const runTemplateTest = (
  appType: AppType,
  toolType: ToolType,
  toolSpecificFiles: string[],
  options: { port: number }
) => {
  let manager: TmpDirManager;

  const appName = `test-${appType}-app-with-${toolType}`;

  const workspaceInfo = getYarnWorkspaces(process.cwd());
  const createGraniteAppPath = findWorkspacePath(workspaceInfo, 'create-granite-app');
  if (!createGraniteAppPath) {
    throw new Error('Unable to find workspace packages');
  }

  const additionalPackagePaths = ADDITIONAL_PACKAGE_NAMES.map((packageName) => {
    const packagePath = findWorkspacePath(workspaceInfo, packageName);

    if (!packagePath) {
      throw new Error('Unable to find workspace packages');
    }

    return { packageName, packagePath };
  });

  beforeAll(async () => {
    manager = await createTmpDir();
    await killPort(options.port).catch(noop);
  });

  afterAll(async () => {
    await killPort(options.port).catch(noop);
    await manager.cleanup();
  });

  it.sequential('create files', async () => {
    const packagePath = path.join(createGraniteAppPath, 'package.tgz');
    const cga = await manager.$('npx', [
      '--package',
      packagePath,
      'create-granite-app',
      appName,
      '--type',
      appType,
      '--tools',
      toolType,
    ]);
    expect(cga.stdout).toContain('Done');

    const packageJsonPath = path.join(manager.dir, appName, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    for (const { packageName, packagePath } of additionalPackagePaths) {
      const packageTgzPath = path.join(packagePath, 'package.tgz');

      if (packageName in packageJson.dependencies) {
        packageJson.dependencies[packageName] = packageTgzPath;
      }

      if (packageName in packageJson.devDependencies) {
        packageJson.devDependencies[packageName] = packageTgzPath;
      }
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    const files = await fs.readdir(path.join(manager.dir, appName));
    const commonFiles = [
      'granite.config.ts',
      'README.md',
      'babel.config.js',
      'index.ts',
      'jest.config.js',
      '.gitignore',
      'jest.setup.ts',
      'package.json',
      'react-native.config.js',
      'src',
      'tsconfig.json',
      ...(appType === 'remote' ? ['pages', 'require.context.ts'] : []),
    ];

    expect(files).toEqual(expect.arrayContaining([...commonFiles, ...toolSpecificFiles]));
    console.log('✅ created files', files);
  });

  it.sequential('checked README.md', async () => {
    const readme = await fs.readFile(path.join(manager.dir, appName, 'README.md'), 'utf8');
    expect(readme).toContain('yarn install');
    expect(readme).toContain('yarn run dev');
    expect(readme).toContain('yarn run build');
    expect(readme).toContain('yarn run test');
    expect(readme).toContain('yarn run typecheck');
    expect(readme).not.toContain('%%packageManager%%');
    console.log('✅ checked README.md', readme);
  });

  it.sequential('checked package.json', async () => {
    const packageJsonPath = path.join(manager.dir, appName, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    expect(packageJson.scripts.lint).toBe(lintScriptMap[toolType]);
    console.log('✅ checked package.json', packageJson);
  });

  it.sequential('yarn install', async () => {
    await fs.writeFile(path.join(manager.dir, appName, 'yarn.lock'), '');

    await manager.$('yarn', ['set', 'version', YARN_VERSION], { cwd: appName });
    await Object.entries(YARN_CONFIGS).reduce(async (prev, [name, value]) => {
      await prev;
      await manager.$('yarn', ['config', 'set', name, ...(typeof value === 'string' ? [value] : value)], {
        cwd: appName,
      });
    }, Promise.resolve());

    await manager.$('yarn', ['install', '--no-immutable'], { cwd: appName });

    console.log('✅ yarn install');
  });

  it.sequential('yarn typecheck', async () => {
    await manager.$('yarn', ['typecheck'], { cwd: appName });
    console.log('✅ yarn typecheck');
  });

  it.sequential('yarn lint', async () => {
    await manager.$('yarn', ['lint'], { cwd: appName });
    console.log('✅ yarn lint');
  });

  it.sequential('yarn build', async () => {
    await manager.$('yarn', ['build'], { cwd: appName });

    const distFolder = path.join(manager.dir, appName, 'dist');
    const distFiles = await fs.readdir(distFolder);
    expect(distFiles).toEqual(
      expect.arrayContaining(['bundle.android.hbc', 'bundle.android.hbc.map', 'bundle.ios.hbc', 'bundle.ios.hbc.map'])
    );
    console.log('✅ yarn build');
  });

  if (appType === 'remote') {
    it.sequential('assert remote app bundle size', async () => {
      const distFolder = path.join(manager.dir, appName, 'dist');
      for (const platform of ['android', 'ios']) {
        const bundlePath = path.join(distFolder, `bundle.${platform}.js`);
        const bundle = await fs.readFile(bundlePath, 'utf8');
        const { size } = await fs.stat(bundlePath);

        // 500kb limit
        expect(size).toBeLessThan(500 * 1024);
        // Check that React-related code is excluded
        for (const marker of ['Minified React error #', 'ReactSharedInternals']) {
          expect(bundle).not.toContain(marker);
        }
      }

      console.log('✅ assert remote app bundle size');
    });
  }

  it.sequential('yarn dev', async () => {
    const devProcess = manager.$('yarn', ['dev', '--port', options.port.toString()], {
      cwd: appName,
    });
    const devExit = devProcess.then(
      () => {
        throw new Error('Dev server exited before the port was ready');
      },
      (error) => {
        throw error;
      }
    );

    try {
      await Promise.race([waitPort({ host: 'localhost', port: options.port, timeout: 120_000 }), devExit]);
    } finally {
      devExit.catch(noop);
    }
    console.log('✅ yarn dev');
    const platforms = ['android', 'ios'];

    for (const platform of platforms) {
      const response = await fetch(
        `http://localhost:${options.port}/index.bundle?platform=${platform}&dev=true&minify=false`
      );
      const text = await response.text();
      expect(text).toContain('__BUNDLE_START_TIME__');
    }
    console.log('✅ fetch bundle');
  });
};

const toolSpecificFilesMap: Record<ToolType, string[]> = {
  biome: ['biome.json'],
  'eslint-prettier': ['.prettierrc', 'eslint.config.mjs'],
};

describe.each([
  { appType: 'remote' as const, toolType: 'biome' as const, port: 8180 },
  { appType: 'remote' as const, toolType: 'eslint-prettier' as const, port: 8181 },
  { appType: 'shared' as const, toolType: 'biome' as const, port: 8182 },
  { appType: 'shared' as const, toolType: 'eslint-prettier' as const, port: 8183 },
])('create a "$appType" template with "$toolType"', ({ appType, toolType, port }) => {
  runTemplateTest(appType, toolType, toolSpecificFilesMap[toolType], { port });
});
