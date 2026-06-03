import fs from 'fs/promises';
import path from 'path';
import killPort from 'kill-port';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import waitPort from 'wait-port';
import { getYarnWorkspaces, findWorkspacePath } from 'workspace-tools';
import { createTmpDir, TmpDirManager } from './createTmpDir';
import { greenfieldNativeModuleTestPage, writeGreenfieldTestPage } from './writeGreenfieldTestPage';

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

describe('create a "greenfield-app" template', () => {
  let manager: TmpDirManager;

  const workspaceInfo = getYarnWorkspaces(process.cwd());
  const createGraniteAppPath = findWorkspacePath(workspaceInfo, 'create-granite-app');

  if (!createGraniteAppPath) {
    throw new Error('Unable to find create-granite-app workspace package');
  }

  beforeAll(async () => {
    manager = await createTmpDir();
  });

  afterAll(async () => {
    manager.cleanup();
  });

  it.sequential('creates native files with default native ids', async () => {
    const appName = 'my-greenfield-app';
    const packagePath = path.join(createGraniteAppPath, 'package.tgz');

    const cga = await manager.$('npx', [
      '--package',
      packagePath,
      'create-granite-app',
      appName,
      '--greenfield',
      '--tools',
      'biome',
    ]);
    expect(cga.stdout).toContain('Done');

    const appPath = path.join(manager.dir, appName);
    const files = await fs.readdir(appPath);
    expect(files).toEqual(expect.arrayContaining(['__tests__', 'android', 'ios', 'src', 'pages', 'package.json']));
    expect(files).not.toEqual(expect.arrayContaining(['app.json', 'jest.config.js', 'jest.setup.ts', 'metro.config.js', 'react-native.config.js']));
    expect(files).toEqual(expect.arrayContaining(['vitest.config.mts']));

    await fs.access(path.join(appPath, 'ios/MyGreenfieldApp.xcodeproj/project.pbxproj'));
    await fs.access(path.join(appPath, 'ios/MyGreenfieldApp.xcodeproj/xcshareddata/xcschemes/MyGreenfieldApp.xcscheme'));
    await fs.access(path.join(appPath, 'ios/MyGreenfieldApp/AppDelegate.swift'));
    await fs.access(path.join(appPath, 'android/app/src/main/java/run/granite/mygreenfieldapp/MainActivity.kt'));
    await fs.access(path.join(appPath, 'android/app/src/main/java/run/granite/mygreenfieldapp/MainApplication.kt'));

    const gradlewStat = await fs.stat(path.join(appPath, 'android/gradlew'));
    expect(gradlewStat.mode & 0o111).not.toBe(0);

    const packageJson = JSON.parse(await fs.readFile(path.join(appPath, 'package.json'), 'utf8'));
    const nativeDependencies = [
      '@granite-js/image',
      '@granite-js/lottie',
      '@granite-js/native',
      '@granite-js/video',
      '@react-native-async-storage/async-storage',
      '@react-native-community/blur',
      '@react-navigation/elements',
      '@react-navigation/native',
      '@react-navigation/native-stack',
      '@shopify/flash-list',
      'react-native-gesture-handler',
      'react-native-pager-view',
      'react-native-safe-area-context',
      'react-native-screens',
      'react-native-svg',
      'react-native-webview',
    ];

    expect(packageJson.dependencies).not.toHaveProperty('@granite-js/screen');
    expect(packageJson.dependencies).not.toHaveProperty('@granite-js/blur-view');
    expect(packageJson.dependencies).not.toHaveProperty('@granite-js/brownfield-module');
    expect(packageJson.dependencies).not.toHaveProperty('@granite-js/cookies');
    expect(packageJson.dependencies).not.toHaveProperty('brick-module');
    for (const dependency of nativeDependencies) {
      expect(packageJson.dependencies).toHaveProperty(dependency);
    }
    expect(packageJson).not.toHaveProperty('optionalDependencies');
    expect(packageJson.scripts.test).toBe('vitest --run');
    expect(packageJson.scripts['test:watch']).toBe('vitest');
    expect(packageJson.devDependencies).not.toHaveProperty('jest');
    expect(packageJson.devDependencies).not.toHaveProperty('@types/jest');
    expect(packageJson.devDependencies).toHaveProperty('vitest');
    expect(packageJson.devDependencies).toHaveProperty('@granite-js/vitest');
    expect(JSON.stringify(packageJson)).not.toContain('workspace:*');

    await expect(fs.access(path.join(appPath, 'src/spec/GraniteBrownfieldModule.brick.ts'))).rejects.toThrow();
    await expect(fs.access(path.join(appPath, 'src/NativeApiCheckScreen.tsx'))).rejects.toThrow();
    await expect(
      fs.access(path.join(appPath, 'android/app/src/main/java/run/granite/mygreenfieldapp/GraniteBrownfieldModule.kt'))
    ).rejects.toThrow();

    const vitestConfig = await fs.readFile(path.join(appPath, 'vitest.config.mts'), 'utf8');
    expect(vitestConfig).toContain("from '@granite-js/vitest'");
    expect(vitestConfig).toContain('reactNative()');

    const appTest = await fs.readFile(path.join(appPath, '__tests__/App.test.tsx'), 'utf8');
    expect(appTest).toContain("from '@testing-library/react-native'");
    expect(appTest).not.toContain("vi.mock('@granite-js/react-native'");

    const pbxproj = await fs.readFile(path.join(appPath, 'ios/MyGreenfieldApp.xcodeproj/project.pbxproj'), 'utf8');
    expect(pbxproj).toContain('PRODUCT_BUNDLE_IDENTIFIER = "run.granite.mygreenfieldapp"');

    const buildGradle = await fs.readFile(path.join(appPath, 'android/app/build.gradle'), 'utf8');
    expect(buildGradle).toContain('applicationId "run.granite.mygreenfieldapp"');
    expect(buildGradle).not.toContain('Brick');
    expect(buildGradle).not.toContain('brownfield');

    const rootBuildGradle = await fs.readFile(path.join(appPath, 'android/build.gradle'), 'utf8');
    expect(rootBuildGradle).toContain('granite-js_lottie');
    expect(rootBuildGradle).toContain('jvmTarget = "17"');

    const gradleProperties = await fs.readFile(path.join(appPath, 'android/gradle.properties'), 'utf8');
    expect(gradleProperties).toContain('GRANITE_IMAGE_DEFAULT_PROVIDER=false');

    const podfile = await fs.readFile(path.join(appPath, 'ios/Podfile'), 'utf8');
    expect(podfile).toContain("ENV['GRANITE_IMAGE_DEFAULT_PROVIDER'] ||= 'false'");
    expect(podfile).not.toContain("pod 'SDWebImage'");
    expect(podfile).not.toContain('brick-module');
    expect(podfile).not.toContain('use_brick_modules!');

    const appDelegate = await fs.readFile(path.join(appPath, 'ios/MyGreenfieldApp/AppDelegate.swift'), 'utf8');
    expect(appDelegate).toContain('GreenfieldReactNativeFactory');
    expect(appDelegate).not.toContain('GraniteViewController');
    expect(appDelegate).not.toContain('Brick');
    expect(appDelegate).not.toContain('Brownfield');
    expect(appDelegate).not.toContain('SDWebImageProvider');
    expect(appDelegate).toContain('GraniteVideoRegistry.shared.register(provider: AVPlayerProvider())');

    const showcaseScreen = await fs.readFile(path.join(appPath, 'src/ShowcaseScreen.tsx'), 'utf8');
    expect(showcaseScreen).toContain('Granite Greenfield');
    expect(showcaseScreen).not.toContain('Brownfield');

    const indexPage = await fs.readFile(path.join(appPath, 'src/pages/index.tsx'), 'utf8');
    expect(indexPage).toContain("import { ShowcaseScreen } from '../ShowcaseScreen'");

    await writeGreenfieldTestPage(appPath, greenfieldNativeModuleTestPage);
    const testPage = await fs.readFile(path.join(appPath, 'src/pages/index.tsx'), 'utf8');
    expect(testPage).toContain("from '@granite-js/native/react-native-fast-image'");
    expect(testPage).toContain("from '@granite-js/native/lottie-react-native'");
    expect(testPage).toContain("from '@granite-js/native/react-native-video'");
    expect(testPage).toContain("from '@granite-js/native/react-native-webview'");

    const activity = await fs.readFile(
      path.join(appPath, 'android/app/src/main/java/run/granite/mygreenfieldapp/MainActivity.kt'),
      'utf8'
    );
    expect(activity).toContain('package run.granite.mygreenfieldapp');
    expect(activity).toContain('override fun getMainComponentName(): String = "shared"');
    expect(activity).toContain('ReactActivity()');
    expect(activity).not.toContain('GraniteActivity');
    expect(activity).not.toContain('Brick');
    expect(activity).not.toContain('Brownfield');
  });

  it.sequential('uses native id overrides', async () => {
    const appName = 'custom-greenfield-app';
    const packagePath = path.join(createGraniteAppPath, 'package.tgz');

    const cga = await manager.$('npx', [
      '--package',
      packagePath,
      'create-granite-app',
      appName,
      '--greenfield',
      '--bundle-id',
      'com.example.iosapp',
      '--android-package',
      'com.example.androidapp',
      '--tools',
      'eslint-prettier',
    ]);
    expect(cga.stdout).toContain('Done');

    const appPath = path.join(manager.dir, appName);
    await fs.access(path.join(appPath, 'android/app/src/main/java/com/example/androidapp/MainActivity.kt'));

    const pbxproj = await fs.readFile(path.join(appPath, 'ios/CustomGreenfieldApp.xcodeproj/project.pbxproj'), 'utf8');
    expect(pbxproj).toContain('PRODUCT_BUNDLE_IDENTIFIER = "com.example.iosapp"');

    const activity = await fs.readFile(
      path.join(appPath, 'android/app/src/main/java/com/example/androidapp/MainActivity.kt'),
      'utf8'
    );
    expect(activity).toContain('package com.example.androidapp');
  });
});
