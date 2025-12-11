import * as swc from '@swc/core';
import * as esbuild from 'esbuild';

export interface BuildConfig {
  /**
   * Build platform
   */
  platform: 'ios' | 'android';
  /**
   * Entry file path
   */
  entry: string;
  /**
   * Build output file path
   */
  outfile: string;
  /**
   * Source map output file path
   *
   * @default `${outfile}.map`
   */
  sourcemapOutfile?: string;
  /**
   * Module resolution configuration
   */
  resolver?: ResolverConfig;
  /**
   * Transformer configuration
   */
  transformer?: {
    transformSync?: TransformSync;
    transformAsync?: TransformAsync;
  };
  /**
   * esbuild configuration
   */
  esbuild?: EsbuildConfig;
  /**
   * Custom babel configuration
   */
  babel?: BabelConfig;
  /**
   * Custom swc configuration
   */
  swc?: SwcConfig;
  /**
   * Flow transform configuration
   */
  flow?: FlowConfig;
  /**
   * Additional data
   *
   * Included in the build result data, used for post-processing based on specific values
   * (eg. add specific extra data in preset, and distinguish which preset the build result is from)
   *
   * ```js
   * const result = new Bundler({
   *   bundlerConfig: {
   *     buildConfig: {
   *       extra: {
   *         reanimated: 3,
   *       },
   *     },
   *   },
   *   ...
   * }).build();
   *
   * if (result.extra?.reanimated === 3) {
   *   // handle build result for reanimated v3
   * }
   * ```
   */
  extra?: any;
  /**
   * Path to `react-native` package path
   */
  reactNativePath?: string;
}

export interface ResolverConfig {
  /**
   * Dependency alias configuration
   */
  alias?: AliasConfig[];
  /**
   * Custom module protocol configuration
   */
  protocols?: ProtocolConfig;
}

export interface AliasConfig extends Pick<esbuild.ResolveOptions, 'importer' | 'kind' | 'resolveDir' | 'with'> {
  /**
   * Replacement target module path
   */
  from: string;
  /**
   * Replacement module path or function that returns module path
   */
  to: ResolveResult | AliasResolver;
  /**
   * - `false`: (default) replace even if subpath exists (`^name(?:$|/)`)
   * - `true`: replace only if the target is exactly matched (`^name$`)
   *
   * ```js
   * const config = {
   *   alias: [
   *    { from: 'react-native', to: 'react-native-0.68' },
   *    { from: 'react', to: 'react-17', exact: true },
   *   ],
   * };
   *
   * // AS IS
   * import * as RN from 'react-native';
   * import 'react-native/Libraries/Core/InitializeCore';
   * import React from 'react';
   * import runtime from 'react/runtime';
   *
   * // TO BE
   * import * as RN from 'react-native-0.68';
   * import 'react-native-0.68/Libraries/Core/InitializeCore';
   * import React from 'react-17';
   * import runtime from 'react/runtime'; // exact
   * ```
   */
  exact?: boolean;
}

export type ResolveResult = string | ResolveResultWithOptions;

export interface ResolveResultWithOptions extends Omit<esbuild.ResolveOptions, 'pluginName' | 'pluginData'> {
  path: string;
}

export type AliasResolver = (context: {
  args: esbuild.OnResolveArgs;
  resolve: esbuild.PluginBuild['resolve'];
}) => ResolveResult | Promise<ResolveResult>;

/**
 * Custom protocol resolve configuration
 *
 * This option configures to directly resolve and load modules referenced by the specified protocol
 *
 * ```ts
 * // AS-IS
 * import mod from 'custom-protocol:/path/to/module';
 *
 * // TO-BE
 * // `custom-protocol:/path/to/module` module is handled as follows
 * export default global.__import('/path/to/module');
 * ```
 *
 * Configuration example
 *
 * ```ts
 * {
 *   'custom-protocol': {
 *     resolve: (args) => args.path,
 *     load: (args) => {
 *       return { loader: 'ts', contents: `export default global.__import('${args.path}')` };
 *     },
 *   },
 * }
 * ```
 */
export interface ProtocolConfig {
  [name: string]: {
    /**
     * Module path to resolve
     */
    resolve?: (args: esbuild.OnResolveArgs) => string | Promise<string>;
    /**
     * Return module code based on the resolved path
     */
    load: (args: esbuild.OnLoadArgs) => esbuild.OnLoadResult | Promise<esbuild.OnLoadResult>;
  };
}

export interface TransformerConfig {
  transformSync?: TransformSync;
  transformAsync?: TransformAsync;
}

export type TransformSync = (id: string, code: string) => string;
export type TransformAsync = (id: string, code: string) => Promise<string>;

export interface EsbuildConfig extends esbuild.BuildOptions {
  /**
   * Script path to inject at the entry point
   *
   * esbuild.inject option added script is not only injected into the entry-point module, but also into all modules.
   * entry-point module's top level only inject code.
   *
   * - injected only once at the top level of the entry-point module
   * - duplicate inject script is removed, reducing bundle size
   *
   * @see issue {@link https://github.com/evanw/esbuild/issues/475}
   */
  prelude?: string[];
}

export interface SwcConfig {
  /**
   * Plugin binary(wasm) path, plugin configuration
   */
  plugins?: NonNullable<swc.JscConfig['experimental']>['plugins'];
  /**
   * Whether to disable transformation of import/export statements
   */
  disableImportExportTransform?: boolean;
  /**
   * Whether to use external helpers for transformations (equivalent of `@babel/runtime`)
   */
  externalHelpers?: boolean;
  /**
   * The JSX runtime to use ('automatic' for React 17+ new JSX transform or 'classic' for traditional JSX transform)
   */
  jsxRuntime?: 'automatic' | 'classic';
  /**
   * The source module for JSX runtime imports (defaults to 'react')
   */
  importSource?: string;
  /**
   * Enable lazy loading for all imports or specific modules
   */
  lazyImports?: boolean | string[];
}

export interface BabelRule {
  /**
   * Condition to match files for this rule
   */
  if: (args: { code: string; path: string }) => boolean;
  /**
   * Babel plugins to apply when condition matches
   */
  plugins?: (string | [string, any])[];
  /**
   * Babel presets to apply when condition matches
   */
  presets?: (string | [string, any])[];
}

export interface BabelConfig {
  /**
   * List of isolated Babel transform rules
   * Each rule applies its plugins/presets only to files matching its condition
   * When multiple rules match, all their plugins and presets are merged and applied
   */
  rules?: BabelRule[];
}

export interface FlowConfig {
  /**
   * Whether to enable Flow transformations
   * @default true
   */
  enabled?: boolean;
  /**
   * Array of module names to include for Flow transformation.
   * Defaults to predefined FLOW_TYPED_MODULES list.
   */
  include?: string[];
  /**
   * Array of module names to exclude from Flow transformation.
   */
  exclude?: string[];
  /**
   * Whether to bypass looking for @flow pragma comment before parsing.
   * @default true
   */
  all?: boolean;
  /**
   * Whether to remove empty import statements which were only used for importing Flow types.
   * @default true
   */
  removeEmptyImports?: boolean;
}
