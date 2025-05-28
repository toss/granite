import { describe, expect, it } from 'vitest';
import { replacePlaceholders } from '../replacePlaceholders';

describe('replacePlaceholders', () => {
  it('placeholder 가 값으로 치환되어야 한다', () => {
    expect(
      replacePlaceholders('{org} / {project} 테스트 입니다', {
        org: 'Granite',
        project: 'mpack',
      })
    ).toEqual('Granite / mpack 테스트 입니다');
  });
});
