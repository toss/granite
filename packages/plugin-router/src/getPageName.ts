import { pascalCase } from 'es-toolkit';

export function getPageName(filePath: string) {
  // Split the file path into segments
  const parts = filePath.split('/');

  // Remove the "pages" directory
  const indexOfPages = parts.indexOf('pages');
  if (indexOfPages === -1) {
    return '';
  } // Invalid path
  const relevantParts = parts.slice(indexOfPages + 1);

  // Ignore the last part if it is "_layout.tsx" or any "_*.tsx"
  if (relevantParts.at(-1)?.startsWith('_')) {
    relevantParts.pop();
  }

  // Get the last relevant part and convert it to PascalCase
  const lastPart = relevantParts.at(-1);
  if (!lastPart) {
    return '';
  } // No valid name found

  return pascalCase(lastPart);
}
