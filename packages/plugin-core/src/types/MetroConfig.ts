import type Module from 'node:module';
import * as babel from '@babel/core';
import type { MetroConfig } from './vendors/metro';

export interface AdditionalMetroConfig extends MetroConfig {
  /**
   * Partial support for some options only
   *
   * - `getPolyfills`
   * - `getModulesRunBeforeMainModule`
   * - `processModuleFilter`
   */
  serializer?: MetroConfig['serializer'] & {
    /**
     * Filter function to determine which modules should be included in the bundle
     * @param module - The module to filter
     * @returns true if the module should be included, false otherwise
     */
    processModuleFilter?: (module: Module) => boolean;
    getModulesRunBeforeMainModule?: () => string[];
  };
  /**
   * Partial support for some options only
   *
   * - `blockList`
   * - `resolverMainFields`
   * - `resolveRequest`
   * - `conditionNames`
   */
  resolver?: MetroConfig['resolver'] & {
    /**
     * Defaults to `['react-native', 'require', 'node', 'default']`
     */
    conditionNames?: string[];
  };
  reporter?: MetroConfig['reporter'];
  babelConfig?: babel.TransformOptions;
  transformSync?: (id: string, code: string) => string;
  projectRoot?: MetroConfig['projectRoot'];
}
