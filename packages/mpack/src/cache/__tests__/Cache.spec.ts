import * as fs from 'fs/promises';
import * as path from 'path';
import { describe, expect, it, beforeAll } from 'vitest';
import { Cache } from '../Cache';

describe('Cache', () => {
  let cache: Cache<{
    data: string;
  }>;

  beforeAll(async () => {
    cache = new Cache('vitest', {
      parse: (data) => ({ data }),
      stringify: (value) => value.data,
    });
  });

  it('캐시된 데이터가 없는 경우 null 이 반환된다', async () => {
    const value = await cache.read('index.js');

    expect(value).toBeNull();
  });

  describe('캐시를 저장하면 ', () => {
    const key = 'test-key';
    const content = 'cache value';

    beforeAll(async () => {
      await cache.write(key, { data: content });
    });

    it('캐시가 저장된다', async () => {
      const value = await cache.read(key);

      expect(value).not.toBeNull();
      expect(value?.data).toEqual(content);
    });

    it('파일 시스템에 캐시가 저장된다', async () => {
      const fsData = await fs.readFile(path.join(cache.getDir(), key), 'utf-8');

      expect(fsData).toEqual(content);
    });
  });
});
