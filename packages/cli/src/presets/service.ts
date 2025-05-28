import type { Preset, PresetContext } from '@granite-js/mpack';
import { isNotNil } from 'es-toolkit';
import { getGlobalVariables, preludePresets, optimizations, graniteRequireProtocol } from './common';
import { babelConditions } from './common/babelConditions';
import { getBuildNumber } from './utils/getBuildNumber';

interface ServicePresetOptions {
  /**
   * 최적화 구성
   */
  optimization?: ServiceOptimizeOptions;
}

interface ServiceOptimizeOptions {
  /**
   * tslib 트리셰이킹 최적화 활성화 (기본값: false)
   */
  'tslib-esm'?: boolean;
}

const DEFAULT_OPTIMIZATION_OPTIONS = {
  'tslib-esm': false,
} as const;

function commonResolver({ optimization = DEFAULT_OPTIMIZATION_OPTIONS }: ServicePresetOptions) {
  return {
    alias: [
      ...[
        '@react-navigation/native-stack',
        '@react-navigation/native',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-svg',
        'react-native-gesture-handler',
        'react-native',
        'react',
      ].map((module) => ({ from: module, to: `granite-require:${module}`, exact: true })),
      optimization['tslib-esm'] ? optimizations.resolveTslibEsm() : null,
    ].filter(isNotNil),
    protocols: {
      'granite-require': graniteRequireProtocol,
    },
  };
}

function getCommonServicePreset(
  context: PresetContext,
  { optimization = DEFAULT_OPTIMIZATION_OPTIONS }: ServicePresetOptions
) {
  const { dev } = context;
  const buildNumber = getBuildNumber();

  return {
    resolver: commonResolver({ optimization }),
    esbuild: {
      /**
       * React Native 및 Granite 앱에서 사용되는 전역변수
       */
      define: getGlobalVariables({ dev }),
      banner: {
        js: [
          preludePresets.graniteAppEnvironment({
            appName: context.appName,
            scheme: context.scheme,
            buildNumber,
          }),
          // symbol-asynciterator polyfill (ES5)
          `(function(){if(typeof Symbol!=="undefined"&&!Symbol.asyncIterator){Symbol.asyncIterator=Symbol.for("@@asyncIterator")}})();`,
        ].join('\n'),
      },
    },
    babel: {
      conditions: babelConditions,
    },
  };
}

const service =
  (options: ServicePresetOptions = {}): Preset =>
  (context: PresetContext) => {
    return getCommonServicePreset(context, options);
  };

export { service, getGlobalVariables, commonResolver };
