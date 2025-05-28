export function parseAppName(uri: string) {
  const [, , appName] = uri.split('/');

  return appName;
}
