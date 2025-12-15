import * as fs from 'fs';
import * as path from 'path';
import { MPACK_CACHE_DIR } from '../constants';

interface CacheConfig<T> {
  /**
   * 파일 시스템에 저장되는 데이터는 string 타입이기에, 데이터를 로드한 후 T 타입으로 변환하기 위한 함수가 필요함.
   */
  parse: (data: string) => T;
  /**
   * 파일 시스템에 저장되는 데이터는 string 타입이기에, stringify 함수가 필요함.
   */
  stringify: (value: T) => string;
}

export class Cache<T> {
  static BASE_CACHE_DIR = MPACK_CACHE_DIR;
  private cache: Record<string, T> = {};
  private cachePath: string;

  constructor(
    cacheDirectoryName: string,
    private config: CacheConfig<T>
  ) {
    this.cachePath = path.join(Cache.BASE_CACHE_DIR, cacheDirectoryName);
    try {
      fs.accessSync(this.cachePath, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }
  }

  getDir() {
    return this.cachePath;
  }

  getMemoryCache() {
    return this.cache;
  }

  async read(key: string) {
    const cache = this.cache[key];
    try {
      // 메모리 캐시 hit
      if (cache) {
        return cache;
      }

      // 파일 시스템 캐시 hit
      const fsCache = await this.readFromFileSystem(key);
      const parsedCache = this.config.parse(fsCache);

      // 파일 캐시만 존재하는 경우에는 메모리 캐시에도 추가합니다
      this.writeToMemory(key, parsedCache);

      return parsedCache;
    } catch {
      // 캐시 없음
      return null;
    }
  }

  async write(key: string, value: T) {
    this.writeToMemory(key, value);
    await this.writeToFileSystem(key, value);
  }

  protected readFromFileSystem(key: string) {
    return fs.promises.readFile(path.join(this.getDir(), key), 'utf-8');
  }

  protected writeToMemory(key: string, value: T) {
    this.cache[key] = value;
  }

  protected writeToFileSystem(key: string, value: T) {
    return fs.promises.writeFile(path.join(this.getDir(), key), this.config.stringify(value), 'utf-8');
  }
}
