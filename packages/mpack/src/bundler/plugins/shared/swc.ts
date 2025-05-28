import path from 'path';
import type { JscConfig } from '@swc/core';
import type { AliasConfig } from '../../../types';

/**
 * `@swc/helpers`를 사용하여 번들 크기를 최적화 하기 위한 구성입니다.
 *
 * swc 옵션과 플러그인에서 처리할 로직은 상호 의존적이기 때문에 한 곳에 모아둡니다.
 */
export const swcHelperOptimizationRules: {
  jsc: JscConfig;
  getAliasConfig: () => AliasConfig;
} = {
  jsc: {
    externalHelpers: true,
  },
  getAliasConfig: () => {
    const swcHelperPath = path.dirname(require.resolve('@swc/helpers/package.json'));

    /**
     * - Input: `'@swc/helpers/_/_object_spread'`
     * - Output: `'_object_spread'`
     */
    function getHelperName(source: string) {
      const tokens = source.split('/');
      return tokens[tokens.length - 1]!;
    }

    return {
      from: '@swc/helpers',
      /**
       * swc 구성의 externalHelpers 를 활성화 시켜 중복되는 유틸 함수를 `@swc/helpers` 패키지로 대체할 수 있으나,
       * Yarn PnP 환경에서는 실제 모듈 의존성에 포함되지 않은 `@swc/helpers` 를 resolve 할 수 없기에 preset 기준 경로로 대체하여 resolve 처리합니다.
       *
       * ```ts
       * // AS-IS
       * import { _ as _foo } from '@swc/helpers/_/_foo';
       *
       * // TO-BE
       * import { _ as _foo } from '/path/to/helpers/esm/_foo';
       * ```
       *
       * @see exports {@link https://github.com/swc-project/swc/blob/main/packages/helpers/package.json#L41}
       */
      to: function resolveSwcHelper(context) {
        return `${swcHelperPath}/esm/${getHelperName(context.args.path)}.js`;
      },
    };
  },
};
