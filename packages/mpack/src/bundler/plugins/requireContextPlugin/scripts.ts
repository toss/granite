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
 * export const context1 = require.context('../path1'); // A
 * export const context2 = require.context('../path2'); // B
 * export default require.context('../path3');          // C
 * ```
 *
 * 형태의 코드를 아래와 같이 변경 (각 호출마다 고유한 변수로 격리)
 *
 * ```js
 * import __context_0__ from 'require-context:../path1';
 * import __context_1__ from 'require-context:../path2';
 * import __context_2__ from 'require-context:../path3';
 *
 * export var context1 = __context_0__; // A
 * export var context2 = __context_1__; // B
 * export default __context_2__;        // C
 * ```
 */
export function toRequireContextExportScript(content: string) {
  const sources: string[] = [];
  let idx = 0;

  // const -> var 변환 이유
  // esbuild config 에서 supported['const-and-let'] 를 false 로 넣어주고 있기 때문에 로드되기 전에 치환
  const MODULE_BODY = content
    .replace(/require\.context\((['"])(.*?)\1\)/g, (_, _quote, source) => {
      sources.push(source);
      return `__context_${idx++}__`;
    })
    .replace('const', 'var');

  if (sources.length === 0) {
    throw new Error('유효하지 않은 require context 구문입니다');
  }

  for (const source of sources) {
    if (!source) {
      throw new Error('유효하지 않은 require context 구문입니다');
    }
  }

  const IMPORT_STATEMENTS = sources
    .map((source, i) => `import __context_${i}__ from '${REQUIRE_CONTEXT_PROTOCOL}${source}';`)
    .join('\n');

  return `
${IMPORT_STATEMENTS}

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
