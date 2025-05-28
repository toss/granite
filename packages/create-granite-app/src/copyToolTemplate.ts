import fs from 'fs/promises';
import path from 'path';
import { merge } from 'es-toolkit';
import { __dirname } from './cwd';

export const TOOL_TEMPLATE_LIST = ['biome', 'eslint-prettier'] as const;

export type ToolTemplateName = (typeof TOOL_TEMPLATE_LIST)[number];

export async function copyToolTemplate(toolTemplateName: ToolTemplateName, templateOptions: { appPath: string }) {
  if (!TOOL_TEMPLATE_LIST.includes(toolTemplateName)) {
    throw new Error(`Template ${toolTemplateName} not found`);
  }

  const toolTemplatePath = path.resolve(__dirname, '..', 'tool-templates', toolTemplateName);
  const _appPath = path.join(process.cwd(), templateOptions.appPath);

  // package.json 파일 경로
  const toolTemplatePackageJsonPath = path.join(toolTemplatePath, 'package.json');
  const appPackageJsonPath = path.join(_appPath, 'package.json');

  const toolTemplatePackageJson = JSON.parse(await fs.readFile(toolTemplatePackageJsonPath, 'utf-8'));
  const appPackageJson = JSON.parse(await fs.readFile(appPackageJsonPath, 'utf-8'));

  const mergedPackageJson = merge(appPackageJson, toolTemplatePackageJson);
  await fs.writeFile(appPackageJsonPath, JSON.stringify(mergedPackageJson, null, 2));

  const files = await fs.readdir(toolTemplatePath);
  await Promise.all(
    files
      .filter((file) => file !== 'package.json')
      .map((file) => {
        const srcPath = path.join(toolTemplatePath, file);
        const destPath = path.join(_appPath, file);
        return fs.cp(srcPath, destPath, { recursive: true });
      })
  );
}
