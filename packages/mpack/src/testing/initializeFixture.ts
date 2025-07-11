import fs from 'fs';
import path from 'path';
import execa from 'execa';
import { createTmpDir } from './tempDir';
import { Cache } from '../cache';
import type { BuildConfig } from '../types';

const ROOT = path.resolve(__dirname, '..', '..');
const PACKED_PATH = path.resolve(ROOT, 'package.tgz');

// Root 에 위치한 .yarnrc.yml 값과 일치하도록 구성
const REPOSITORY_CONFIGS = {
  enableGlobalCache: [JSON.stringify(false)],
};

export type FixtureTestContext = Awaited<ReturnType<typeof initializeFixture>>;

export async function initializeFixture() {
  const fixtureDir = await createTmpDir();

  await initializeYarn();
  await installMpack();

  async function $(command: string, args?: string[], options: execa.Options = {}) {
    return await execa(command, args, { cwd: fixtureDir, ...options });
  }

  async function initializeYarn() {
    await $('yarn', ['set', 'version', '4.9.1']);
    await $('yarn', ['init', '-y', '-w']);
    await Object.entries(REPOSITORY_CONFIGS).reduce((prev, [name, value]) => {
      return prev.then(() => {
        return $('yarn', ['config', 'set', name, ...value]).then(() => {});
      });
    }, Promise.resolve());
  }

  function resolvePath(p: string) {
    return path.resolve(fixtureDir, p);
  }

  function applyPlaceholders(content: string, placeholders?: Record<string, string>) {
    return Object.entries(placeholders ?? {}).reduce((prev, [key, value]) => {
      return prev.replaceAll(`$${key}`, value);
    }, content);
  }

  async function installMpack() {
    await $('yarn', ['add', `@granite-js/mpack@${PACKED_PATH}`]);
  }

  async function installDependencies(...deps: string[]) {
    await $('yarn', ['add', ...deps]);
  }

  async function getVirtualPath(request: string) {
    const virtualPath = await $('node', ['-e', `console.log(require.resolve('${request}'));`]);
    return virtualPath.stdout.trim();
  }

  async function buildWithConfig(config: BuildConfig, options?: execa.Options) {
    const buildScriptPath = path.resolve(fixtureDir, 'build.js');
    const buildScript = await fs.promises.readFile(path.resolve(__dirname, './fixtures/build-with-config.js'), {
      encoding: 'utf-8',
    });

    const VIRTUAL_INITIALIZE_CORE_PROTOCOL = 'virtual-initialize-core';
    const reactNativePath = path.dirname(await getVirtualPath('react-native'));
    const initializeCorePath = path.join(reactNativePath, 'Libraries/Core/InitializeCore.js');
    const replaces = {
      __load_fn__: `() => ({ loader: 'js', contents: '// noop' })`,
    };

    /**
     * In testing environment, we need to replace the `InitializeCore.js` with a virtual protocol
     * because cannot evaluate React Native specific code in Node.js environment.
     */
    config.resolver = {
      ...config.resolver,
      alias: [
        {
          from: `prelude:${initializeCorePath}`,
          to: `${VIRTUAL_INITIALIZE_CORE_PROTOCOL}:noop`,
          exact: false,
        },
        ...(config.resolver?.alias ?? []),
      ],
      protocols: {
        ...config.resolver?.protocols,
        [VIRTUAL_INITIALIZE_CORE_PROTOCOL]: {
          // @ts-expect-error -- function cannot be serialized
          load: '__load_fn__',
        },
      },
    };

    const serializedConfig = Object.entries(replaces).reduce(
      (prev, [key, value]) => prev.replaceAll(`"${key}"`, value),
      JSON.stringify(config, null, 2)
    );

    await fs.promises.writeFile(buildScriptPath, applyPlaceholders(buildScript, { config: serializedConfig }), 'utf-8');

    await $('node', [buildScriptPath], options);
  }

  async function readFile(relativePath: string) {
    return await fs.promises.readFile(path.resolve(fixtureDir, relativePath), 'utf-8');
  }

  async function writeFile(relativePath: string, content: string) {
    await fs.promises.writeFile(path.resolve(fixtureDir, relativePath), content, 'utf-8');
  }

  async function loadFixtures(basePath: string, fixtureName: string, placeholders?: Record<string, string>) {
    const fixturePath = path.join(basePath, 'fixtures', fixtureName);
    const files = await fs.promises.readdir(fixturePath, { encoding: 'utf-8' });

    await Promise.all(
      files.map(async (filename) => {
        const content = applyPlaceholders(
          await fs.promises.readFile(path.join(fixturePath, filename), { encoding: 'utf-8' }),
          placeholders
        );

        await writeFile(filename, content);
      })
    );
  }

  async function cleanup() {
    await fs.promises.rm(fixtureDir, { recursive: true, force: true });
  }

  Cache.BASE_CACHE_DIR = path.join(fixtureDir, '.cache');

  return {
    dir: fixtureDir,
    $,
    installDependencies,
    readFile,
    writeFile,
    loadFixtures,
    buildWithConfig,
    resolvePath,
    cleanup,
  };
}
