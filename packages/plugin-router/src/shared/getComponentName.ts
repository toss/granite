import { pascalCase } from 'es-toolkit';

export function getComponentName(filePath: string): string {
  const path = filePath.replace(/^pages\//, '').replace(/\.(tsx|ts)$/, '');

  const segments = path.split('/').filter(Boolean);

  if (segments[segments.length - 1] === 'index') {
    segments.pop();
  }

  const componentName = segments.map((segment) => pascalCase(segment)).join('');

  return componentName || 'Index';
}
