import path from 'path';

export function stripExtension(value: string) {
  return value.replace(new RegExp(`${path.extname(value)}$`), '');
}
