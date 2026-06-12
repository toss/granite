import fs from 'fs/promises';
import path from 'path';
import { merge } from 'es-toolkit';
import { __dirname } from './cwd';
import { transformTemplate } from './transformTemplate';

export const TEMPLATE_LIST = ['granite-app', 'greenfield-app'] as const;

export type TemplateName = (typeof TEMPLATE_LIST)[number];

interface TemplateComposition {
  /**
   * Template directories applied in order. The first layer is copied as-is,
   * and each following layer is overlaid on top of it: files overwrite the
   * previous layers, except `package.json` which is treated as a partial
   * and deep-merged into the app's `package.json`.
   */
  layers: readonly string[];
  /** Files from previous layers that must not be included in the final app. */
  exclude?: readonly string[];
}

const TEMPLATE_COMPOSITIONS: Record<TemplateName, TemplateComposition> = {
  'granite-app': { layers: ['granite-app'] },
  'greenfield-app': {
    layers: ['granite-app', 'greenfield-native'],
    exclude: ['react-native.config.js'],
  },
};

export async function copyTemplate(
  templateName: TemplateName,
  templateOptions: {
    appPath: string;
    appName: string;
    needYarnrc?: boolean;
    bundleId?: string;
    androidPackage?: string;
    androidPackagePath?: string;
    nativeAppName?: string;
  }
) {
  const composition = TEMPLATE_COMPOSITIONS[templateName];

  if (composition == null) {
    throw new Error(`Template ${templateName} not found`);
  }

  const _appPath = path.join(process.cwd(), templateOptions.appPath);
  const [baseLayer, ...overlayLayers] = composition.layers;

  if (baseLayer == null) {
    throw new Error(`Template ${templateName} has no layers`);
  }

  await fs.cp(getTemplatePath(baseLayer), _appPath, { recursive: true });

  for (const overlayLayer of overlayLayers) {
    await applyOverlayLayer(getTemplatePath(overlayLayer), _appPath);
  }

  await Promise.all(
    (composition.exclude ?? []).map((file) => fs.rm(path.join(_appPath, file), { force: true, recursive: true }))
  );

  const templateValues = {
    appName: templateOptions.appName,
    bundleId: templateOptions.bundleId ?? '',
    androidPackage: templateOptions.androidPackage ?? '',
    androidPackagePath: templateOptions.androidPackagePath ?? '',
    nativeAppName: templateOptions.nativeAppName ?? '',
  };

  const files = await fs.readdir(_appPath, { recursive: true });
  const filePromises = files.map(async (file) => {
    // When publishing to npm, .gitignore is automatically converted to .npmignore and ignored
    // So we rename .gitignore to _gitignore for distribution
    if (file === '_gitignore') {
      await fs.rename(path.join(_appPath, file), path.join(_appPath, '.gitignore'));
      return;
    }

    const filePath = path.join(_appPath, file.toString());
    const stat = await fs.stat(filePath);

    if (stat.isFile()) {
      const content = await fs.readFile(filePath);
      if (isTextFile(content)) {
        const newContent = transformTemplate(content.toString('utf-8'), templateValues);
        await fs.writeFile(filePath, newContent);
      }
    }
  });

  await Promise.all(filePromises);
  await renameTemplatePaths(_appPath, templateValues);
  await makeExecutableIfExists(path.join(_appPath, 'android', 'gradlew'));

  if (templateOptions.needYarnrc) {
    await fs.writeFile(path.join(_appPath, '.yarnrc.yml'), 'enableGlobalCache: false');
  }
}

function getTemplatePath(layerName: string) {
  return path.resolve(__dirname, '..', 'templates', layerName);
}

/**
 * Copies an overlay layer on top of the app. The layer's `package.json` is a
 * partial that is deep-merged into the app's `package.json` (same convention
 * as tool templates), and every other file overwrites the app's copy.
 */
async function applyOverlayLayer(layerPath: string, appPath: string) {
  const layerPackageJsonPath = path.join(layerPath, 'package.json');
  const appPackageJsonPath = path.join(appPath, 'package.json');

  const layerPackageJson = JSON.parse(await fs.readFile(layerPackageJsonPath, 'utf-8'));
  const appPackageJson = JSON.parse(await fs.readFile(appPackageJsonPath, 'utf-8'));

  const mergedPackageJson = merge(appPackageJson, layerPackageJson);
  await fs.writeFile(appPackageJsonPath, JSON.stringify(mergedPackageJson, null, 2));

  const files = await fs.readdir(layerPath);
  await Promise.all(
    files
      .filter((file) => file !== 'package.json')
      .map((file) => fs.cp(path.join(layerPath, file), path.join(appPath, file), { recursive: true }))
  );
}

async function makeExecutableIfExists(filePath: string) {
  try {
    await fs.chmod(filePath, 0o755);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

function isTextFile(content: Buffer): boolean {
  return !content.includes(0);
}

async function renameTemplatePaths(rootPath: string, templateValues: Record<string, string>) {
  const files = await fs.readdir(rootPath, { recursive: true });
  const paths = files
    .map((file) => file.toString())
    .sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

  for (const relativePath of paths) {
    const nextRelativePath = transformTemplate(relativePath, templateValues);
    if (nextRelativePath === relativePath) {
      continue;
    }

    const from = path.join(rootPath, relativePath);
    const to = path.join(rootPath, nextRelativePath);

    try {
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.rename(from, to);
    } catch (error) {
      if (['EEXIST', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) {
        const stat = await fs.stat(from);
        if (stat.isDirectory()) {
          await fs.rm(from, { recursive: true, force: true });
          continue;
        }
      }

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }
}
