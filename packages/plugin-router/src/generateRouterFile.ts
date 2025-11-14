import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, parse } from 'path';
import { checkExportRoute } from './checkExportRoute';
import { getComponentName } from './getComponentName';
import { getPath } from './getPath';
import { ROUTER_GEN_TEMPLATE } from './template';
import { transformTemplate } from './utils/transformTemplate';

export function generateRouterFile() {
  const cwd = process.cwd();
  function getPageFiles(dir: string, prefix = ''): string[] {
    const files = readdirSync(join(cwd, dir), { withFileTypes: true });

    return files.reduce<string[]>((acc, file) => {
      if (file.isDirectory()) {
        return [...acc, ...getPageFiles(`${dir}/${file.name}`, `${prefix}${file.name}/`)];
      }

      if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
        const name = parse(file.name).name;
        const ext = parse(file.name).ext;
        return [...acc, `${prefix}${name}${ext}`];
      }

      return acc;
    }, []);
  }

  const allPages = getPageFiles('pages');
  const exportRouteMap = new Map(allPages.map((page) => [page, checkExportRoute(join(cwd, 'pages', page))]));

  const pageFiles = allPages.filter((page) => !page.startsWith('_') && exportRouteMap.get(page));

  const pageImports = pageFiles
    .map((page) => {
      const componentName = getComponentName(page);
      const pagePath = getPath(page);
      return transformTemplate("import { Route as _%%componentName%%Route } from '../pages%%pagePath%%';", {
        componentName,
        pagePath,
      });
    })
    .join('\n');

  const pageInputRoutes = pageFiles
    .map((page) => {
      const componentName = getComponentName(page);
      const pagePath = getPath(page);
      return transformTemplate("    '%%pagePath%%': typeof _%%componentName%%Route['_inputType'];", {
        componentName,
        pagePath,
      });
    })
    .join('\n');

  const pageRoutes = pageFiles
    .map((page) => {
      const componentName = getComponentName(page);
      const pagePath = getPath(page);
      return transformTemplate("    '%%pagePath%%': typeof _%%componentName%%Route['_outputType'];", {
        componentName,
        pagePath,
      });
    })
    .join('\n');

  const generatedContent = transformTemplate(ROUTER_GEN_TEMPLATE, {
    pageImports,
    pageInputRoutes,
    pageRoutes,
  });

  const routerFilePath = join(cwd, 'src', 'router.gen.ts');

  if (existsSync(routerFilePath)) {
    const existingContent = readFileSync(routerFilePath, 'utf-8');
    if (existingContent === generatedContent) {
      return;
    }
  }

  writeFileSync(routerFilePath, generatedContent);
  console.log('✅ Router file generated successfully!');
}
