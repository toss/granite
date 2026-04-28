import { describe, expect, it } from 'vitest';
import { toRequireContextExportScript } from '../scripts';

describe('toRequireContextExportScript', () => {
  describe('유효하지 않은 require context 구문인 경우', () => {
    it('require.context() 호출부가 없으면 에러가 발생한다', () => {
      expect(() => toRequireContextExportScript('export const context = require.context')).toThrow();
      expect(() => toRequireContextExportScript('export const context = 1')).toThrow();
    });

    it('인자에 source 가 없으면 에러가 발생한다', () => {
      expect(() => toRequireContextExportScript('export const context = require.context()')).toThrow();
      expect(() => toRequireContextExportScript('export const context = require.context("")')).toThrow();
    });
  });

  describe('유효한 require context 구문인 경우', () => {
    const source = './module';

    it('named export 가 정상적으로 변환된다', () => {
      expect(toRequireContextExportScript(`export const context = require.context('${source}')`))
        .toMatchInlineSnapshot(`
        "import __context_0__ from 'require-context:./module';

        export var context = __context_0__"
      `);
    });

    it('default export 가 정상적으로 변환된다', () => {
      expect(toRequireContextExportScript(`export default require.context('${source}')`)).toMatchInlineSnapshot(`
        "import __context_0__ from 'require-context:./module';

        export default __context_0__"
      `);
    });

    it('여러 require.context() 호출이 각각 격리된 변수로 변환된다', () => {
      expect(
        toRequireContextExportScript(
          `export const ctx1 = require.context('./moduleA');\nexport const ctx2 = require.context('./moduleB');`
        )
      ).toMatchInlineSnapshot(`
        "import __context_0__ from 'require-context:./moduleA';
        import __context_1__ from 'require-context:./moduleB';

        export var ctx1 = __context_0__;
        export var ctx2 = __context_1__;"
      `);
    });

    it('default export 와 named export 혼합 시 각각 격리된다', () => {
      expect(
        toRequireContextExportScript(
          `export const ctx = require.context('./moduleA');\nexport default require.context('./moduleB');`
        )
      ).toMatchInlineSnapshot(`
        "import __context_0__ from 'require-context:./moduleA';
        import __context_1__ from 'require-context:./moduleB';

        export var ctx = __context_0__;
        export default __context_1__;"
      `);
    });

    it('deep=false 파라미터가 쿼리스트링으로 인코딩된다', () => {
      expect(
        toRequireContextExportScript(`export default require.context('./module', false)`)
      ).toMatchInlineSnapshot(`
        "import __context_0__ from 'require-context:./module?deep=false';

        export default __context_0__"
      `);
    });

    it('deep=true 이면 쿼리스트링에 포함되지 않는다', () => {
      expect(
        toRequireContextExportScript(`export default require.context('./module', true)`)
      ).toMatchInlineSnapshot(`
        "import __context_0__ from 'require-context:./module';

        export default __context_0__"
      `);
    });

    it('filter 파라미터가 쿼리스트링으로 인코딩된다', () => {
      expect(
        toRequireContextExportScript(`export default require.context('../../', true, /\\.preview\\.tsx$/)`)
      ).toMatchInlineSnapshot(`
        "import __context_0__ from 'require-context:../../?filterSrc=%5C.preview%5C.tsx%24&filterFlags=';

        export default __context_0__"
      `);
    });

    it('deep=false + filter 파라미터가 함께 쿼리스트링으로 인코딩된다', () => {
      expect(
        toRequireContextExportScript(`export default require.context('../../', false, /\\.preview\\.tsx$/)`)
      ).toMatchInlineSnapshot(`
        "import __context_0__ from 'require-context:../../?deep=false&filterSrc=%5C.preview%5C.tsx%24&filterFlags=';

        export default __context_0__"
      `);
    });
  });
});
