import { describe, expect, it } from 'vitest';
import { mergeBanners } from '../mergeBanners';

describe('mergeBanners', () => {
  it('두 개의 banner를 잘 합쳐준다.', () => {
    const baseBanner = {
      js: `console.log('foo');`,
      css: '/* foo */',
    };

    const overrideBanner = {
      js: `console.log('bar');`,
    };

    expect(mergeBanners(baseBanner, overrideBanner)).toMatchInlineSnapshot(`
      {
        "css": "/* foo */",
        "js": "console.log('foo');
      console.log('bar');",
      }
    `);
  });
});
