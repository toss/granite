import { expect, it, describe } from 'vitest';
import { transformTemplate } from './transformTemplate';

describe('transformTemplate', () => {
  it('단일 플레이스홀더를 올바르게 대체해야 합니다', () => {
    const result = transformTemplate('안녕하세요 %%name%%님', { name: '홍길동' });
    expect(result).toBe('안녕하세요 홍길동님');
  });

  it('여러 플레이스홀더를 올바르게 대체해야 합니다', () => {
    const result = transformTemplate('안녕하세요 %%name%%님, 당신의 나이는 %%age%%살 입니다.', {
      name: '홍길동',
      age: '20',
    });
    expect(result).toBe('안녕하세요 홍길동님, 당신의 나이는 20살 입니다.');
  });

  it('동일한 플레이스홀더가 여러번 나타나는 경우 모두 대체해야 합니다', () => {
    const result = transformTemplate('%%name%%님 안녕하세요, %%name%%님을 다시 만나뵙게 되어 기쁩니다.', {
      name: '홍길동',
    });
    expect(result).toBe('홍길동님 안녕하세요, 홍길동님을 다시 만나뵙게 되어 기쁩니다.');
  });

  it('플레이스홀더가 없는 문자열은 그대로 반환해야 합니다', () => {
    const result = transformTemplate('안녕하세요', {} as any);
    expect(result).toBe('안녕하세요');
  });
});
