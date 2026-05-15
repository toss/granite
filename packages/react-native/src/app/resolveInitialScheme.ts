export function resolveInitialScheme({
  initialPropsScheme,
  initialScheme,
  getSchemeUri,
}: {
  initialPropsScheme?: string;
  initialScheme?: string;
  getSchemeUri: () => string;
}) {
  return initialPropsScheme ?? initialScheme ?? getSchemeUri();
}
