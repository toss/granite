import SentryCLI from '@sentry/cli';
import { asyncNoop } from 'es-toolkit';
import type { SentryPluginContext, SentryPluginOptions } from './types';
import { uploadSourcemap, type UploadSourcemapOptions } from './uploadSourcemap';

export interface SentryClientActions {
  uploadSourcemap: ({ root }: Omit<SentryPluginContext, 'client'>, options: UploadSourcemapOptions) => Promise<void>;
}

export function createClientActions(options: SentryPluginOptions): SentryClientActions {
  if (options.enabled === false || options.useClient === false) {
    return {
      uploadSourcemap: asyncNoop,
    };
  }

  const client = new SentryCLI(null, options);

  return {
    uploadSourcemap: async (context, options) => {
      await uploadSourcemap({ client, ...context }, options);
    },
  };
}
