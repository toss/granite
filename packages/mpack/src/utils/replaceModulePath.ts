export function replaceModulePath(path: string, from: string, to: string) {
  const subpath = path.slice(from.length);
  return `${to}${subpath}`;
}
