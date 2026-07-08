export interface MicroFrontendPluginOptions extends MicroFrontendOptions {
  /**
   * Path to react-native base directory.
   *
   * Defaults to project's `react-native` directory.
   */
  reactNativeBasePath?: string;
}

export interface MicroFrontendOptions {
  /**
   * Container name
   */
  name: string;
  /**
   * Configuration for the remote field to emulate the internal `importLazy` behavior
   */
  remote?: RemoteConfig;
  /**
   * Named remote apps served by local dev servers. In development the host
   * prefetches each app's bundle and `__mpackInternal.loadRemote(appName)`
   * evaluates the matching one — unlike `remote`, multiple services can be
   * loaded into one host.
   */
  remotes?: RemoteAppConfig[];
  /**
   * Shared modules config
   */
  shared?: SharedConfig | string[];
  /**
   * Configuration for exposing modules to other containers
   */
  exposes?: ExposeConfig;
  /**
   * Wrap the bundle body into a named callable entry.
   *
   * @default true
   */
  scopeBundle?: boolean;
}

export interface RemoteConfig {
  /**
   * Host name
   */
  host: string;
  /**
   * Port number
   */
  port: number;
}

export interface RemoteAppConfig extends RemoteConfig {
  /**
   * App name of the remote service (its scoped entry registry key)
   */
  name: string;
}

export interface SharedConfig {
  [lib: string]: {
    /**
     * Whether the module is eager
     *
     * Specifies whether the module is eager; if true, it's bundled with the host, otherwise loaded from the shared registry
     */
    eager?: boolean;
  };
}

export interface ExposeConfig {
  [exposePath: string]: string;
}
