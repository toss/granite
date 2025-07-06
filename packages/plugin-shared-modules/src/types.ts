export interface SharedModulesPluginOptions {
  /**
   * Container name
   */
  name: string;
  /**
   * Configuration for the remote field to emulate the internal `importLazy` behavior
   */
  remote?: RemoteConfig;
  /**
   * Shared modules config
   */
  shared?: SharedConfig;
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

export interface SharedConfig {
  [lib: string]: {
    /**
     * Whether the module is a singleton
     *
     * Only `true` is supported for now.
     */
    singleton: true;
    /**
     * Whether the module is eager
     *
     * Specifies whether the module is eager; if true, it's bundled with the host, otherwise loaded from the shared registry
     */
    eager?: boolean;
  };
}
