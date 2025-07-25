import type { BuildConfig } from '@granite-js/plugin-core';

export interface BundlerConfig {
  /**
   * Project root path
   */
  rootDir: string;
  /**
   * Development mode
   */
  dev: boolean;
  /**
   * Enable transform caches
   */
  cache: boolean;
  /**
   * Generate metafile
   */
  metafile: boolean;
  /**
   * Build configuration
   */
  buildConfig: BuildConfig;
}
