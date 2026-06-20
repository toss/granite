import fs from 'fs/promises';
import path from 'path';
import { transformTemplate } from '@granite-js/utils';
import { merge } from 'es-toolkit';
import { __dirname } from './cwd';
import { TEMPLATE_MODULE_LIST, type TemplateModuleName } from './templateModules';

const BASE_TEMPLATE_NAME = 'granite-app';

type TemplateOptions = {
  appPath: string;
  appName: string;
  packageManager: string;
  needYarnrc?: boolean;
};

type TemplateValues = {
  appName: string;
  packageManager: string;
};

async function mergePackageJson(sourcePath: string, destPath: string, values: TemplateValues) {
  const sourceContent = transformTemplate(await fs.readFile(sourcePath, 'utf-8'), values);
  const sourcePackageJson = JSON.parse(sourceContent);

  try {
    const destPackageJson = JSON.parse(await fs.readFile(destPath, 'utf-8'));
    const mergedPackageJson = merge(destPackageJson, sourcePackageJson);
    await fs.writeFile(destPath, JSON.stringify(mergedPackageJson, null, 2));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, JSON.stringify(sourcePackageJson, null, 2));
      return;
    }

    throw error;
  }
}

async function writeTemplateFile(sourcePath: string, destPath: string, values: TemplateValues) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  const content = await fs.readFile(sourcePath, 'utf-8');
  const newContent = transformTemplate(content, values);

  await fs.writeFile(destPath, newContent);
}

async function applyTemplateDirectory(templatePath: string, templateOptions: TemplateOptions) {
  const appPath = path.resolve(templateOptions.appPath);
  const values = {
    appName: templateOptions.appName,
    packageManager: templateOptions.packageManager,
  };

  const files = await fs.readdir(templatePath, { recursive: true });

  await Promise.all(
    files.map(async (file) => {
      const relativePath = file.toString();
      const sourcePath = path.join(templatePath, relativePath);
      const stat = await fs.stat(sourcePath);

      if (!stat.isFile()) {
        return;
      }

      const destRelativePath = relativePath === '_gitignore' ? '.gitignore' : relativePath;
      const destPath = path.join(appPath, destRelativePath);

      if (relativePath === 'package.json') {
        await mergePackageJson(sourcePath, destPath, values);
        return;
      }

      await writeTemplateFile(sourcePath, destPath, values);
    })
  );
}

export async function copyTemplate(templateOptions: TemplateOptions) {
  const templatePath = path.resolve(__dirname, '..', 'templates', BASE_TEMPLATE_NAME);

  await applyTemplateDirectory(templatePath, templateOptions);

  if (templateOptions.needYarnrc) {
    await fs.writeFile(path.join(path.resolve(templateOptions.appPath), '.yarnrc.yml'), 'enableGlobalCache: false');
  }
}

export async function applyTemplateModule(moduleName: TemplateModuleName, templateOptions: TemplateOptions) {
  if (!TEMPLATE_MODULE_LIST.includes(moduleName)) {
    throw new Error(`Template module ${moduleName} not found`);
  }

  const modulePath = path.resolve(__dirname, '..', 'templates', 'modules', moduleName);

  await applyTemplateDirectory(modulePath, templateOptions);
}
