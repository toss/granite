import { performance, type PerformanceMeasure, type MarkOptions } from 'perf_hooks';
import { noop } from 'es-toolkit';

export interface PerfStatic {
  trace: (name: string, options?: MarkOptions) => Perf;
  withTrace: <T>(
    task: () => T | Promise<T>,
    config: {
      name: string;
      startOptions?: MarkOptions;
      stopOptions?: (result: Awaited<T>) => MarkOptions;
    }
  ) => Promise<T>;
  getSummary: () => Record<
    string,
    {
      averageDuration: number;
      records: PerfResult[];
    }
  > | null;
}

export interface Perf {
  stop: (options?: MarkOptions) => void;
}

export interface PerfResult {
  sequence: number;
  startTime: number;
  duration: number;
  detail?: PerformanceMeasure['detail'];
}

enum TracePhase {
  Start = 'start',
  End = 'end',
  Measure = 'measure',
}

// 동시 다발적으로 trace 가 호출될 경우 각각의 trace를 고유한 상태로 유지하기 위한 시퀀스 값
const sequences: Record<string, number> = {};

// 수집한 trace 데이터
const records: Record<
  string,
  {
    sequence: number;
    duration: PerformanceMeasure['duration'];
    name: PerformanceMeasure['name'];
    startTime: PerformanceMeasure['startTime'];
    detail: Record<string, unknown>;
  }
> = {};

function getName(name: string, phase: TracePhase, sequence: number) {
  return `${name}.${phase}#${sequence}`;
}

function parseName(name: string) {
  const [traceName] = name.split('.');
  return traceName ?? '';
}

const PerformanceImpl: PerfStatic = {
  trace(name: string, options?: MarkOptions) {
    const sequence = typeof sequences[name] === 'number' ? ++sequences[name] : (sequences[name] = 0);
    const startName = getName(name, TracePhase.Start, sequence);
    const endName = getName(name, TracePhase.End, sequence);
    const measureName = getName(name, TracePhase.Measure, sequence);
    const startMark = performance.mark(startName, options);

    return {
      stop: (options?: MarkOptions) => {
        const endMark = performance.mark(endName, options);
        const measureResult = performance.measure(measureName, startName, endName);

        records[measureName] = {
          sequence,
          duration: measureResult.duration,
          name: measureResult.name,
          startTime: measureResult.startTime,
          detail: {
            ...(startMark.detail ?? {}),
            ...(endMark.detail ?? {}),
          },
        };

        performance.clearMarks(startName);
        performance.clearMarks(endName);
        performance.clearMeasures(measureName);
      },
    };
  },
  async withTrace(task, config) {
    const trace = PerformanceImpl.trace(config.name, config.startOptions);

    try {
      const result = await task();
      const stopMarkOptions = config.stopOptions?.(result);
      trace.stop(stopMarkOptions);
      return result;
    } catch (error) {
      trace.stop({ detail: { error } });
      throw error;
    }
  },
  getSummary() {
    const results: ReturnType<PerfStatic['getSummary']> = {};

    Object.entries(records).map(([measureName, performanceMeasure]) => {
      const name = parseName(measureName);
      const result = {
        sequence: performanceMeasure.sequence,
        startTime: performanceMeasure.startTime,
        duration: performanceMeasure.duration,
        ...(Object.keys(performanceMeasure.detail).length > 0 ? { detail: performanceMeasure.detail } : null),
      };

      if (results[name] === undefined) {
        results[name] = { averageDuration: 0, records: [result] };
      } else {
        results[name]!.records.push(result);
      }
    });

    Object.values(results).forEach((result) => {
      result.averageDuration = result.records.reduce((acc, curr) => acc + curr.duration, 0) / result.records.length;
    });

    return results;
  },
};

const PerformanceShim: PerfStatic = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trace(_name: string) {
    return { stop: noop };
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async withTrace(task, _config) {
    const result = await task();
    return result;
  },
  getSummary() {
    return null;
  },
};

/**
 * Mpack 번들러 성능 측정을 위한 플래그
 *
 * - 빌드 이후 요약 로그가 기록됨
 * - 모든 Trace 정보를 포함하는 `perf.json` 파일이 생성됨
 *
 * ```
 * MPACK_TRACE=1 yarn granite bundle
 * ```
 */
const perfTraceEnabled = process.env.MPACK_TRACE === '1';

export const Performance = perfTraceEnabled ? PerformanceImpl : PerformanceShim;
