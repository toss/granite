import * as path from 'path';
import { isNotNil } from 'es-toolkit';
import { OnLoadArgs, PluginBuild } from 'esbuild';
import { PRELUDE_PROTOCOL } from '../../../../constants';
import { normalizePath } from '../../../../utils/esbuildUtils';
import { createNonRecursiveResolver } from '../../resolveHelpers';

const IS_ENTRY_FLAG = Symbol.for('mpack:IS_ENTRY_FLAG');

/**
 * Register `onResolve` callback to mark the module as entry point module
 */
export function registerEntryPointMarker(build: PluginBuild) {
  const resolver = createNonRecursiveResolver(build);

  build.onResolve({ filter: /\.([mc]js|[tj]sx?)$/ }, async (args) => {
    if (args.kind !== 'entry-point') {
      return null;
    }

    const result = await resolver(args, {
      importer: args.importer,
      kind: args.kind,
      resolveDir: args.resolveDir,
    });

    return result ? { ...result, pluginData: IS_ENTRY_FLAG } : null;
  });
}

/**
 * Register `onResolve` callback to resolve the virtual prelude script path
 *
 * This callback is used to resolve the virtual prelude script path without tree shaking.
 *
 * ```ts
 * import 'prelude:foo';
 * import 'prelude:bar';
 * import 'prelude:baz';
 * ```
 */
export function registerPreludeScriptResolver(build: PluginBuild) {
  build.onResolve({ filter: new RegExp(`^${PRELUDE_PROTOCOL}.*`) }, (args) => {
    const basePath = args.path.slice(PRELUDE_PROTOCOL.length);
    const resolvePath = path.resolve(args.resolveDir, basePath);

    return { path: resolvePath, sideEffects: true };
  });
}

export function isEntryPoint(args: OnLoadArgs) {
  return args.pluginData === IS_ENTRY_FLAG;
}

/**
 * Returns string that inject prelude script at the top of the code
 *
 * ```ts
 * import 'prelude:foo';
 * import 'prelude:bar';
 * import 'prelude:baz';
 * // ...
 * ```
 */
export function injectPreludeScript(
  code: string,
  {
    preludeScriptPaths,
  }: {
    preludeScriptPaths: string[];
  }
) {
  return [...preludeScriptPaths.map((path) => `import '${PRELUDE_PROTOCOL}${normalizePath(path)}';`), code]
    .filter(isNotNil)
    .join('\n');
}
