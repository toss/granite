import type { SharedConfig } from '../runtime/registry';

export interface MicroFrontendPluginOptions {
  appName: string;
  shared?: SharedConfig | readonly string[];
  exposes?: Readonly<Record<string, string>>;
}
