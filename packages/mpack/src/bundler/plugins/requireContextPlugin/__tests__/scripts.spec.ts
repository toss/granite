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
        export const ctx2 = __context_1__;"
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
  });
});
