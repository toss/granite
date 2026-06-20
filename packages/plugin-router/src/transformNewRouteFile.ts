import { transformTemplate } from '@granite-js/utils';
import { getComponentName } from './getComponentName';
import { getPageName } from './getPageName';
import { getPath } from './getPath';
import { NEW_LAYOUT_FILE_TEMPLATE, NEW_ROUTE_FILE_TEMPLATE } from './template';

export async function transformNewRouteFile(path: string) {
  return transformTemplate(NEW_ROUTE_FILE_TEMPLATE, {
    path: getPath(path),
    componentName: getComponentName(path),
  });
}

export async function transformNewLayoutFile(path: string) {
  return transformTemplate(NEW_LAYOUT_FILE_TEMPLATE, {
    componentName: getPageName(path),
  });
}
