export interface AppEnvironment {
  readonly scheme: string;
  readonly host: string;
}

export function resolveAppEnvironment(): AppEnvironment {
  return {
    scheme: global.__granite.app.scheme,
    host: global.__granite.app.host,
  };
}
