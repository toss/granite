import SentryCLI from '@sentry/cli';
import { asyncNoop } from 'es-toolkit';
import type { SentryPluginContext, SentryPluginOptions } from './types';
import { uploadSourcemap } from './uploadSourcemap';

export interface SentryClientActions {
  uploadSourcemap: (bundle: string, sourcemap: string, { root }: Omit<SentryPluginContext, 'client'>) => Promise<void>;
}

export function createClientActions(options: SentryPluginOptions): SentryClientActions {
  if (options.enabled === false || options.useClient === false) {
    return {
      uploadSourcemap: asyncNoop,
    };
  }

  const client = new SentryCLI(null, options);

  return {
    uploadSourcemap: async (bundle: string, sourcemap: string, { root }: Omit<SentryPluginContext, 'client'>) => {
      await uploadSourcemap(bundle, sourcemap, { client, root });
    },
  };
}
