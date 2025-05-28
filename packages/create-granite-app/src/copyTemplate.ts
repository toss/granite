import fs from 'fs/promises';
import path from 'path';
import { __dirname } from './cwd';
import { transformTemplate } from './transformTemplate';

export const TEMPLATE_LIST = ['granite-app'] as const;

export type TemplateName = (typeof TEMPLATE_LIST)[number];

export async function copyTemplate(
  templateName: TemplateName,
  templateOptions: { appPath: string; appName: string; needYarnrc?: boolean }
) {
  if (!TEMPLATE_LIST.includes(templateName)) {
    throw new Error(`Template ${templateName} not found`);
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', templateName);
  const _appPath = path.join(process.cwd(), templateOptions.appPath);

  await fs.cp(templatePath, _appPath, { recursive: true });

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
      const content = await fs.readFile(filePath, 'utf-8');
      const newContent = transformTemplate(content, {
        appName: templateOptions.appName,
      });
      await fs.writeFile(filePath, newContent);
    }
  });

  await Promise.all(filePromises);

  if (templateOptions.needYarnrc) {
    await fs.writeFile(path.join(_appPath, '.yarnrc.yml'), 'enableGlobalCache: false');
  }
}
