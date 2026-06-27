import fs from 'fs/promises';
import path from 'path';
import { merge } from 'es-toolkit';
import { __dirname } from './cwd';

export const TOOL_TEMPLATE_LIST = ['biome', 'eslint-prettier'] as const;

export type ToolTemplateName = (typeof TOOL_TEMPLATE_LIST)[number];

function getToolTemplatePath(toolTemplateName: ToolTemplateName) {
  if (!TOOL_TEMPLATE_LIST.includes(toolTemplateName)) {
    throw new Error(`Template ${toolTemplateName} not found`);
  }

  return path.resolve(__dirname, '..', 'tool-templates', toolTemplateName);
}

async function copyToolTemplateFiles(toolTemplatePath: string, appPath: string) {
  const files = await fs.readdir(toolTemplatePath);
  await Promise.all(
    files
      .filter((file) => file !== 'package.json')
      .map((file) => {
        const srcPath = path.join(toolTemplatePath, file);
        const destPath = path.join(appPath, file);
        return fs.cp(srcPath, destPath, { recursive: true });
      })
  );
}

export async function copyToolTemplates(toolTemplateNames: ToolTemplateName[], templateOptions: { appPath: string }) {
  const appPath = path.join(process.cwd(), templateOptions.appPath);
  const appPackageJsonPath = path.join(appPath, 'package.json');

  let mergedPackageJson = JSON.parse(await fs.readFile(appPackageJsonPath, 'utf-8'));
  const toolTemplatePaths = toolTemplateNames.map(getToolTemplatePath);

  for (const toolTemplatePath of toolTemplatePaths) {
    const toolTemplatePackageJsonPath = path.join(toolTemplatePath, 'package.json');
    const toolTemplatePackageJson = JSON.parse(await fs.readFile(toolTemplatePackageJsonPath, 'utf-8'));
    mergedPackageJson = merge(mergedPackageJson, toolTemplatePackageJson);
  }

  await fs.writeFile(appPackageJsonPath, JSON.stringify(mergedPackageJson, null, 2));
  await Promise.all(toolTemplatePaths.map((toolTemplatePath) => copyToolTemplateFiles(toolTemplatePath, appPath)));
}

export async function copyToolTemplate(toolTemplateName: ToolTemplateName, templateOptions: { appPath: string }) {
  await copyToolTemplates([toolTemplateName], templateOptions);
}
