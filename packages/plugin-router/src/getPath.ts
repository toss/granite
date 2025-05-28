export function getPath(filePath: string): string {
  // Remove leading 'pages/' and trailing extension
  let path = filePath.replace(/^pages\//, '').replace(/\.[^/.]+$/, '');

  // If the path ends in 'index', remove it, unless it's just 'index'
  if (path.endsWith('/index')) {
    path = path.replace(/\/index$/, '');
  } else if (path === 'index') {
    path = '';
  }

  // Ensure it starts with a slash, unless it's empty (then root)
  return `/${path}`;
}
