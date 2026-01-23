type VisibilitySubscription = { remove: () => void };

type GraniteModuleType = {
  onVisibilityChanged: (handler: ({ visible }: { visible: boolean }) => void) => VisibilitySubscription;
  getConstants: () => { schemeUri: string };
  closeView: () => Promise<void>;
};

const noopSubscription: VisibilitySubscription = {
  remove: () => {},
};

function getSchemeUriFromGlobal(): string | undefined {
  const app = (globalThis as any)?.__granite?.app as { name?: string; scheme?: string; host?: string } | undefined;

  if (!app?.scheme || !app?.name) {
    return undefined;
  }

  const base = app.host && app.host.length > 0 ? `${app.scheme}://${app.host}/` : `${app.scheme}://`;

  return `${base}${app.name}`;
}

function getSchemeUriFallback(): string {
  const location = (globalThis as any)?.location;

  if (location?.href) {
    return location.href;
  }

  return 'http://localhost/';
}

export const GraniteModule: GraniteModuleType = {
  onVisibilityChanged: () => noopSubscription,
  getConstants: () => ({
    schemeUri: getSchemeUriFromGlobal() ?? getSchemeUriFallback(),
  }),
  closeView: async () => {},
};
