import type { SentryPluginContext } from './types';

export function uploadSourcemap(bundlePath: string, sourcemapPath: string, context: SentryPluginContext) {
  return context.client.execute(
    ['sourcemaps', 'upload', '--debug-id-reference', '--strip-prefix', context.root, bundlePath, sourcemapPath],
    true
  );
}
