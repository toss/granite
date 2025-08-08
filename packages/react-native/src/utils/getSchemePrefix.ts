export function getSchemePrefix({ scheme, appName, host }: { scheme: string; appName: string; host: string }) {
  const base = host.length > 0 ? `${scheme}://${host}/` : `${scheme}://`;

  return new URL(`${base}${appName}`).toString();
}
