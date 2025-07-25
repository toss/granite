import path from 'path';

export function getDefaultOutfileName(entryFile: string, platform: 'android' | 'ios') {
  const basename = path.basename(entryFile);
  const extname = path.extname(basename);
  const name = basename.replace(extname, '');

  return `${name}.${platform}.js`;
}
