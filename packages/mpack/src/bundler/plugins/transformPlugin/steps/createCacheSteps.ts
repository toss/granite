import { Cache } from '../../../../cache';
import { Performance } from '../../../../performance';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';

interface CacheStepConfig {
  id: string;
  enabled: boolean;
}

interface TransformCache {
  /**
   * 변환을 거친 코드
   */
  transformed: string;
  /**
   * 파일이 수정된 시간의 Unix timestamp (fs.stat)
   */
  mtimeMs: number;
}

export function createCacheSteps(config: CacheStepConfig) {
  const transformCache = new Cache<TransformCache>(`transformed-${config.id}`, {
    parse: (data) => ({ transformed: data, mtimeMs: 0 }),
    stringify: (value) => value.transformed,
  });

  const readCodeFromCache: AsyncTransformStep = async (code, _args, context) => {
    if (!config.enabled) {
      return { code };
    }

    const cache = await Performance.withTrace(() => transformCache.read(context.key), {
      name: 'read-cache',
    });

    return cache?.transformed ? { code: cache.transformed, done: true } : { code };
  };

  const writeCodeToCache: AsyncTransformStep = async (code, _args, context) => {
    if (config.enabled) {
      const trace = Performance.trace('write-cache');
      await transformCache.write(context.key, {
        mtimeMs: context.mtimeMs,
        transformed: code,
      });
      trace.stop();
    }
    return { code };
  };

  return { beforeTransform: readCodeFromCache, afterTransform: writeCodeToCache };
}
