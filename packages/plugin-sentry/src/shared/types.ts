import SentryCLI, { type SentryCliOptions } from '@sentry/cli';

export type SentryPluginOptions = WithSentryCliOptions | WithoutSentryCliOptions;

interface WithSentryCliOptions extends SentryCliOptions, BaseSentryPluginOptions {
  useClient?: true;
}

interface WithoutSentryCliOptions extends BaseSentryPluginOptions {
  useClient: false;
}

interface BaseSentryPluginOptions {
  /**
   * @default true
   */
  enabled?: boolean;
}

export interface SentryPluginContext {
  client: SentryCLI;
  root: string;
}

export interface SentryPluginResult {
  bundle: string;
  sourcemap: string;
  debugId: string;
}
