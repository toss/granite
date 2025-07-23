import type { RuntimeContext } from '@granite-js/plugin-micro-frontend/runtime';
import type { ComponentType } from 'react';

export type InitialProps = any;

export interface GraniteGlobal {
  /**
   * Page component of the service bundle
   */
  Page: ComponentType<InitialProps> | null;

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
  __SHARED_MODULES__: RuntimeContext;
}
