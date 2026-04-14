export function getSchemePrefix({ scheme, appName, host }: { scheme: string; appName: string; host: string }) {
  return host.length > 0 ? `${scheme}://${host}/${appName}` : `${scheme}://${appName}`;
}
