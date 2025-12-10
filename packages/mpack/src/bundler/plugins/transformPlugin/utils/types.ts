import type * as swc from '@swc/core';

export interface FlowLoaderOptions {
  enabled?: boolean;
  include?: string[];
  exclude?: string[];
  all?: boolean;
  removeEmptyImports?: boolean;
}

export interface SwcLoaderOptions {
  plugins?: NonNullable<swc.JscConfig['experimental']>['plugins'];
  disableImportExportTransform?: boolean;
  externalHelpers?: boolean;
  jsxRuntime?: 'automatic' | 'classic';
  importSource?: string;
  lazyImports?: boolean | string[];
}

export interface CodegenOptions {
  enabled?: boolean;
}
