import * as babel from '@babel/core';
import type { BabelConfig } from './BuildConfig';
import type { MetroConfig } from './vendors/metro';

export interface AdditionalMetroConfig extends MetroConfig {
  /**
   * Partial support for some options only
   *
   * - `getPolyfills`
   */
  serializer?: MetroConfig['serializer'];
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
  /**
   * @deprecated Use `babel` instead. This field is kept for backward compatibility.
   */
  babelConfig?: babel.TransformOptions;
  /**
   * Rules-based Babel configuration for Metro bundler.
   * Each rule applies its plugins/presets only to files matching its condition.
   */
  babel?: BabelConfig;
  transformSync?: (id: string, code: string) => string;
  projectRoot?: MetroConfig['projectRoot'];
}
