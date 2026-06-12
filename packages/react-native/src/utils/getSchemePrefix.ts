export function getSchemePrefix({
  scheme,
  appName,
  host,
  standalone = false,
}: {
  scheme: string;
  appName: string;
  host: string;
  standalone?: boolean;
}) {
  // Standalone (greenfield) apps own the whole scheme, so deep links resolve
  // as `scheme://path` without the brownfield `appName` host segment.
  if (standalone) {
    return `${scheme}://`;
  }

  return host.length > 0 ? `${scheme}://${host}/${appName}` : `${scheme}://${appName}`;
}
