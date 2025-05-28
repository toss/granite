import type { ComponentType } from 'react';
import type { __granite_require__ } from './granite-require/__granite_require__';

export type InitialProps = any;

export interface GraniteGlobal {
  /**
   * Page component of the service bundle
   */
  Page: ComponentType<InitialProps> | null;
  /**
   * Whether code splitting is enabled
   */
  __SPLIT_CHUNK_ENABLED__: boolean;
  /**
   * Utility function for referencing common modules
   */
  __granite_require__: typeof __granite_require__;

  /**
   * @internal
   * Set of global functions injected in Mpack development mode
   */
  __mpackInternal: {
    /**
     * Function to evaluate the main bundle from preloaded bundles
     */
    evaluateMainBundle: () => Promise<void>;
  };
}
