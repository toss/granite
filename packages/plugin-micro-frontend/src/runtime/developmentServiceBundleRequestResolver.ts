import type { ServiceBundleRequestResolver } from './serviceBundleLoader';

const DEFAULT_FIRST_SERVICE_PORT = 8082;

export interface DevelopmentServiceBundleRequestResolverOptions {
  readonly firstServicePort?: number;
  readonly hostname?: string;
  readonly platform: string;
}

export function createDevelopmentServiceBundleRequestResolver({
  firstServicePort = DEFAULT_FIRST_SERVICE_PORT,
  hostname = 'localhost',
  platform,
}: DevelopmentServiceBundleRequestResolverOptions): ServiceBundleRequestResolver {
  const portByService = new Map<string, number>();
  let nextPort = firstServicePort;

  return ({ serviceKey }) => {
    let port = portByService.get(serviceKey);
    if (port == null) {
      port = nextPort;
      nextPort += 1;
      portByService.set(serviceKey, port);
    }

    const bundleRequest = new URL(`http://${hostname}:${port}/index.bundle`);
    bundleRequest.searchParams.set('platform', platform);
    bundleRequest.searchParams.set('dev', 'true');
    bundleRequest.searchParams.set('minify', 'false');
    return bundleRequest.toString();
  };
}
