import { BuildConfig } from './BuildConfig';

export interface BundlerConfig {
  /**
   * Task indentifier
   */
  tag: string;
  /**
   * Project root path
   */
  rootDir: string;
  /**
   * Application name
   */
  appName: string;
  /**
   * Scheme prefix
   */
  scheme: string;
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
  /**
   * @deprecated
   *
   * Configuration for integrating external services
   */
  services?: ServiceConfig;
}

interface ServiceConfig {
  sentry?: {
    /**
     * Defaults to `true`
     */
    enabled?: boolean;
    /**
     * Defaults to `process.env.SENTRY_AUTH_TOKEN`
     */
    authToken?: string;
    org?: string;
    project?: string;
  };
}
