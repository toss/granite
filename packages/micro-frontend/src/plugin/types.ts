import type { SharedConfig } from '../runtime/registry';

export interface MicroFrontendPluginOptions {
  readonly shared?: SharedConfig | readonly string[];
  readonly exposes?: Readonly<Record<string, string>>;
}
