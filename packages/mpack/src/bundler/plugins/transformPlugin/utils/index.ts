export { FLOW_TYPED_MODULES, isFlowTypedModule } from './flowTypedModules';
export type { FlowTypedModuleOptions } from './flowTypedModules';

export {
  isTypeScriptSource,
  isTSXSource,
  isJavaScriptSource,
  isJSXSource,
  shouldUseHermesParser,
  getSwcParserConfig,
} from './parserSelection';
export type { SwcParserSyntax, SwcParserConfig } from './parserSelection';

export type { FlowLoaderOptions, SwcLoaderOptions, CodegenOptions } from './types';
