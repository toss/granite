import fs from 'fs/promises';
import path from 'path';
import killPort from 'kill-port';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import waitPort from 'wait-port';
import { getYarnWorkspaces, findWorkspacePath } from 'workspace-tools';
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

type ToolType = 'biome' | 'eslint-prettier';

const runTemplateTest = (toolType: ToolType, toolSpecificFiles: string[], options: { port: number }) => {
  let manager: TmpDirManager;

  const appName = `test-app-with-${toolType}`;

  const workspaceInfo = getYarnWorkspaces(process.cwd());
  const [
    createGraniteAppPath,
    graniteReactNativePath,
    graniteNativePath,
    granitePluginRouterPath,
    granitePluginHermesPath,
    babelPresetGranitePath,
  ] = [
    findWorkspacePath(workspaceInfo, 'create-granite-app'),
    findWorkspacePath(workspaceInfo, '@granite-js/react-native'),
    findWorkspacePath(workspaceInfo, '@granite-js/native'),
    findWorkspacePath(workspaceInfo, '@granite-js/plugin-router'),
    findWorkspacePath(workspaceInfo, '@granite-js/plugin-hermes'),
    findWorkspacePath(workspaceInfo, 'babel-preset-granite'),
  ];

  if (
    !(
      createGraniteAppPath &&
      graniteReactNativePath &&
      graniteNativePath &&
      granitePluginRouterPath &&
      granitePluginHermesPath &&
      babelPresetGranitePath
    )
  ) {
    throw new Error('Unable to find workspace packages');
  }

  beforeAll(async () => {
    manager = await createTmpDir();
    killPort(options.port).catch(noop);
  });

  afterAll(async () => {
    manager.cleanup();
    killPort(options.port).catch(noop);
  });

  it.sequential('create files', async () => {
    const packagePath = path.join(createGraniteAppPath, 'package.tgz');
    const cga = await manager.$('npx', ['--package', packagePath, 'create-granite-app', appName, '--tools', toolType]);
    expect(cga.stdout).toContain('Done');

    // Update package.json
    const packageJsonPath = path.join(manager.dir, appName, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    packageJson.dependencies['@granite-js/react-native'] = path.join(graniteReactNativePath, 'package.tgz');
    packageJson.dependencies['@granite-js/native'] = path.join(graniteNativePath, 'package.tgz');
    packageJson.devDependencies['babel-preset-granite'] = path.join(babelPresetGranitePath, 'package.tgz');
    packageJson.devDependencies['@granite-js/plugin-router'] = path.join(granitePluginRouterPath, 'package.tgz');
    packageJson.devDependencies['@granite-js/plugin-hermes'] = path.join(granitePluginHermesPath, 'package.tgz');
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
      'pages',
      'react-native.config.js',
      'require.context.ts',
      'src',
      'tsconfig.json',
    ];

    expect(files).toEqual(expect.arrayContaining([...commonFiles, ...toolSpecificFiles]));
    console.log('✅ created files', files);
  });

  it.sequential('checked package.json', async () => {
    const packageJsonPath = path.join(manager.dir, appName, 'package.json');
    const packageJson = await fs.readFile(packageJsonPath, 'utf8');

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

  it.sequential('yarn dev', async () => {
    manager
      .$('yarn', ['dev', '--port', options.port.toString()], {
        cwd: appName,
      })
      .catch(noop);

    await waitPort({ host: 'localhost', port: options.port });
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

describe('create a "granite-app" template with "biome"', () => {
  runTemplateTest('biome', toolSpecificFilesMap['biome'], { port: 8180 });
});

describe('create a "granite-app" template with "eslint-prettier"', () => {
  runTemplateTest('eslint-prettier', toolSpecificFilesMap['eslint-prettier'], { port: 8181 });
});
