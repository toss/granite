import type { SentryPluginContext } from './types';

export interface UploadSourcemapOptions {
  bundlePath: string;
  sourcemapPath: string;
}

export function uploadSourcemap(context: SentryPluginContext, { bundlePath, sourcemapPath }: UploadSourcemapOptions) {
  return context.client.execute(
    ['sourcemaps', 'upload', '--debug-id-reference', '--strip-prefix', context.root, bundlePath, sourcemapPath],
    true
  );
}
