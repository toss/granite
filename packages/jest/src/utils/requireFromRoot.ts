export function requireFromRoot(id: string, rootDir: string) {
  const resolvedPath = require.resolve(id, { paths: [rootDir] });

  return require(resolvedPath);
}
