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
        "import __context__ from 'require-context:./module';

        export var context = __context__"
      `);
    });

    it('default export 가 정상적으로 변환된다', () => {
      expect(toRequireContextExportScript(`export default require.context('${source}')`)).toMatchInlineSnapshot(`
        "import __context__ from 'require-context:./module';

        export default __context__"
      `);
    });
  });
});
