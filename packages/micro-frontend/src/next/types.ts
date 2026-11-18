import type { SharedConfig } from '../runtime/registry';

export interface MicroFrontendPluginOptions {
  appName: string;
  shared?: SharedConfig | readonly string[];
  exposes?: Readonly<Record<string, string>>;
  /**
   * Initialize the bundle as a container: defer its evaluation so that the native evaluator passes the
   * evaluation identity, and run the host's `hooks.beforeInitContainer` before any module runs.
   * Defaults to `true` for bundles with `exposes` (remotes). Without native or host support the bundle runs
   * exactly as before.
   */
  containerInit?: boolean;
}
