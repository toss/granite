import * as path from 'path';
import { isNotNil } from 'es-toolkit';
import { OnLoadArgs, PluginBuild } from 'esbuild';
import { PRELUDE_PROTOCOL } from '../../../../constants';
import { normalizePath } from '../../../../utils/esbuildUtils';

const skipResolve = Symbol.for('skipResolve');
const isEntry = Symbol.for('isEntry');

/**
 * Entry Point 모듈을 찾아 마킹하기 위한 `onResolve` 콜백 등록
 */
export function registerEntryPointMarker(build: PluginBuild) {
  build.onResolve({ filter: /\.([mc]js|[tj]sx?)$/ }, async (args) => {
    if (args.pluginData !== skipResolve && args.kind === 'entry-point') {
      const { path, errors } = await build.resolve(args.path, {
        importer: args.importer,
        kind: args.kind,
        resolveDir: args.resolveDir,
        // 한 번만 resolve 하기 위한 플래그 값
        pluginData: skipResolve,
      });

      // enrty-point 파일인 경우 isEntry 플래그 추가
      return errors.length === 0 ? { path, pluginData: isEntry } : { errors };
    }

    return null;
  });
}

/**
 * 가상의 Prelude script 경로를 Tree Shaking 없이 직접 resolve 하기 위한 `onResolve` 콜백 등록
 */
export function registerPreludeScriptResolver(build: PluginBuild) {
  build.onResolve({ filter: new RegExp(`^${PRELUDE_PROTOCOL}.*`) }, (args) => {
    const basePath = args.path.slice(PRELUDE_PROTOCOL.length);
    const resolvePath = path.resolve(args.resolveDir, basePath);

    return { path: resolvePath, sideEffects: true };
  });
}

export function isEntryPoint(args: OnLoadArgs) {
  return args.pluginData === isEntry;
}

/**
 * 코드 최상단에 prelude 스크립트 추가
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
