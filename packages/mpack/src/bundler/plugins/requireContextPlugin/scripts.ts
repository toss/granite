import { REQUIRE_CONTEXT_PROTOCOL } from '../../../constants';

interface RequireContextModule {
  moduleIndex: number;
  absolutePath: string;
  relativePath: string;
}

/**
 * require context export 스크립트 반환
 *
 * ```js
 * export const context = require.context('../path'); // A
 * export default require.context('../path'); // B
 * ```
 *
 * 형태의 코드를 아래와 같이 변경
 *
 * ```js
 * // Sample
 * import __context__ from 'require-context:../path';
 *
 * export var context = __context__; // A
 * export default __context__; // B
 * ```
 */
export function toRequireContextExportScript(content: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, source] = content.match(/require\.context\((.*?)\)/) ?? [];
  const parsedSource = source?.replace(/['"]/g, '');

  if (!parsedSource) {
    throw new Error('유효하지 않은 require context 구문입니다');
  }

  const IMPORT_STATEMENT = `import __context__ from '${REQUIRE_CONTEXT_PROTOCOL}${parsedSource}';`;

  // const -> var 변환 이유
  // esbuild config 에서 supported['const-and-let'] 를 false 로 넣어주고 있기 때문에 로드되기 전에 치환
  const MODULE_BODY = content.replace(/require\.context\('(.*?)'\)/, '__context__').replace('const', 'var');

  return `
${IMPORT_STATEMENT}

${MODULE_BODY}
`.trim();
}

/**
 * require context 스크립트
 *
 * ```js
 * // Sample
 * import * as module0 from "/path/to/module-0";
 * import * as module1 from "/path/to/module-1";
 * import * as module2 from "/path/to/module-2";
 *
 * var requireContext = function(key) {
 *   var _modules = {};
 *
 *   _modules["./relative/path/of/module-0"] = module0;
 *   _modules["./relative/path/of/module-1"] = module1;
 *   _modules["./relative/path/of/module-2"] = module2;
 *
 *   return _modules[key];
 * };
 *
 * requireContext.keys = function() {
 *   return [
 *     "./relative/path/of/module-0",
 *     "./relative/path/of/module-1",
 *     "./relative/path/of/module-2",
 *   ];
 * };
 *
 * export default requireContext;
 * ```
 */
export function getRequireContextScript(modules: RequireContextModule[]) {
  const IMPORT_STATEMENTS = modules
    .map((module) => `import * as module${module.moduleIndex} from ${JSON.stringify(module.absolutePath)};`)
    .join('\n');

  const ASSIGN_STATEMENTS = modules
    .map((module) => `_modules[${JSON.stringify(module.relativePath)}] = module${module.moduleIndex};`)
    .join('\n');

  return `
${IMPORT_STATEMENTS}

var requireContext = function(key) {
  var _modules = {};
  
  ${ASSIGN_STATEMENTS}

  return _modules[key];
};

requireContext.keys = function() {
  return [${modules.map((module) => JSON.stringify(module.relativePath)).join(',')}];
};

export default requireContext;
`.trim();
}
