import * as babel from '@babel/core';
import { injectDisposeAppName, type DisposeOwnershipPluginOptions } from './disposeBabelPlugin';

export function shouldTransformDispose(code: string): boolean {
  return (
    code.includes('globalThis._graniteMicroFrontend.dispose') ||
    code.includes('global._graniteMicroFrontend.dispose')
  );
}

export function transformDisposeOwnership(
  id: string,
  code: string,
  options: DisposeOwnershipPluginOptions
): string {
  if (options.appName == null || !shouldTransformDispose(code)) {
    return code;
  }

  return (
    babel.transformSync(code, {
      ast: false,
      babelrc: false,
      configFile: false,
      filename: id,
      parserOpts: {
        plugins: getParserPlugins(id),
        sourceType: 'unambiguous',
      },
      plugins: [[injectDisposeAppName, options]],
      retainLines: true,
    })?.code ?? code
  );
}

function getParserPlugins(id: string): babel.ParserOptions['plugins'] {
  const plugins: babel.ParserOptions['plugins'] = [];

  if (/\.[cm]?tsx?$/.test(id)) {
    plugins.push('typescript');
  } else if (/\.[cm]?jsx?$/.test(id)) {
    plugins.push('flow');
  }

  if (/\.[cm]?[jt]sx$/.test(id)) {
    plugins.push('jsx');
  }

  return plugins;
}
