import type { RuntimeContext } from '@granite-js/plugin-micro-frontend/runtime';

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

  /**
   * @internal
   * Micro frontend runtime
   */
  __MICRO_FRONTEND__: RuntimeContext;
}
