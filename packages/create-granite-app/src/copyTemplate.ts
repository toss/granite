import fs from 'fs/promises';
import path from 'path';
import { __dirname } from './cwd';
import { transformTemplate } from './transformTemplate';

export const TEMPLATE_LIST = ['granite-app', 'greenfield-app'] as const;

export type TemplateName = (typeof TEMPLATE_LIST)[number];

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
  if (!TEMPLATE_LIST.includes(templateName)) {
    throw new Error(`Template ${templateName} not found`);
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', templateName);
  const _appPath = path.join(process.cwd(), templateOptions.appPath);

  await fs.cp(templatePath, _appPath, { recursive: true });

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
