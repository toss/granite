import * as babel from '@babel/core';
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
   */
  resolver?: MetroConfig['resolver'];
  reporter?: MetroConfig['reporter'];
  babelConfig?: babel.TransformOptions;
  transformSync?: (id: string, code: string) => string;
  projectRoot?: MetroConfig['projectRoot'];
}
