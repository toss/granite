import { describe, expect, it } from 'vitest';
import { md5 } from '../md5';

describe('md5', () => {
  it('입력한 값에 대응하는 md5 해시값이 생성된다', () => {
    expect(md5('hello', 'world', 1, 2, 3)).toMatchInlineSnapshot(`"cd1b8ecf103743a98958211a11e33b71"`);
  });
});
