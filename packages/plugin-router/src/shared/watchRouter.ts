import { readFile, writeFile } from 'fs/promises';
import { join, parse } from 'path';
import chokidar from 'chokidar';
import { kebabCase } from 'es-toolkit';
import { generateRouterFile } from './generateRouterFile';
import { transformNewLayoutFile, transformNewRouteFile } from './transformNewRouteFile';

export interface WatchRouterOptions {
  /**
   * Generate router file immediately when `watchRouter` is called.
   *
   * Defaults to `false`.
   */
  immediate?: boolean;
}

export function watchRouter(root = process.cwd()) {
  const generate = () => generateRouterFile(root);
  const watcher = chokidar.watch('./pages', {
    ignored: (path, stats) => {
      return Boolean(stats?.isFile() && !path.endsWith('.ts') && !path.endsWith('.tsx'));
    },
    ignoreInitial: true,
    persistent: true,
    cwd: root,
  });

  const handleAdd = async (path: string) => {
    const file = join(root, path);
    const code = await readFile(file, 'utf8');

    if (code !== '') {
      return;
    }

    const filename = parse(path).name;

    // ignore _ keyword
    if (filename.startsWith('_')) {
      switch (filename) {
        case '_layout':
          console.log('👀 Layout file has been added');
          await writeFile(file, await transformNewLayoutFile(path));
          return;
        default:
          return;
      }
    }

    const componentName = kebabCase(filename);
    if (componentName !== filename) {
      console.log(
        `❌ File name should be in kebab-case format. Would you like to rename ${filename} to ${componentName}?`
      );
      return;
    }

    console.log(`👀 File ${path} has been added`);
    await writeFile(file, await transformNewRouteFile(path));
    generate();
  };

  watcher.on('add', handleAdd);
  watcher.on('change', generate);
  watcher.on('unlink', generate);

  return async () => {
    watcher.off('add', handleAdd);
    watcher.off('change', generate);
    watcher.off('unlink', generate);
    await watcher.close();
  };
}
