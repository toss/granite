export interface GraniteGlobal {
  /**
   * @internal
   * Set of global functions injected in Mpack development mode
   */
  __mpackInternal: {
    /**
     * Function to load the preloaded remote bundle
     */
    loadRemote: () => Promise<void>;
  };
}
