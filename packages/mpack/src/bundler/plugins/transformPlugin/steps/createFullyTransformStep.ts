import * as path from 'path';
import * as babel from '@babel/core';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

interface FullyTransformStepConfig {
  dev: boolean;
  additionalBabelOptions?: babel.TransformOptions;
}

export function createFullyTransformStep({
  dev,
  additionalBabelOptions,
}: FullyTransformStepConfig): AsyncTransformStep {
  const baseOptions: babel.TransformOptions = {
    configFile: additionalBabelOptions?.configFile || false,
    presets: [
      [
        /**
         * React Native Hermes 대응을 위해
         * 최대한 낮은 버전의 JS 엔진을 지원하도록 IE 11로 설정
         * 추후 정확한 target으로 설정 필요
         */
        require.resolve('@babel/preset-env'),
        {
          targets: {
            ie: 11,
          },
          /**
           * supportsStaticESM 이 true 이면 modules 가 false 로 처리되어야 하는데,
           * 기본값('auto')이 적용되어 안내 로그가 찍히고 있어 직접 값 지정
           *
           * @see source {@link https://github.com/babel/babel/blob/v7.23.10/packages/babel-preset-env/src/index.ts#L398-L403}
           */
          modules: false,
        },
      ],
      /**
       * react-native-reanimated 등 TypeScript를 직접 export하는 라이브러리를 다루기 위해
       * @babel/preset-typescript 포함 필요
       */
      require.resolve('@babel/preset-typescript'),
      /**
       * react-native-reanimated 등 .tsx 직접 export하는 라이브러리를 다루기 위해
       * @babel/preset-react 포함 필요
       */
      [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
      [require.resolve('@react-native/babel-preset')],
      ...(additionalBabelOptions?.presets ?? []),
    ],
    plugins: [
      /**
       * react-native에서 직접 export 하는 flow 파일 대응을 위해 strip types 추가 필요
       */
      [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }],
      [require.resolve('@babel/plugin-proposal-private-property-in-object'), { loose: true }],
      [require.resolve('@babel/plugin-proposal-private-methods'), { loose: true }],
      ...(additionalBabelOptions?.plugins ?? []),
    ],
  };

  const fullyTransformStep: AsyncTransformStep = async function fullyTransform(code, args) {
    const babelOptions = babel.loadOptions({
      minified: false,
      compact: false,
      babelrc: false,
      configFile: false,
      envName: dev ? 'development' : 'production',
      ...baseOptions,
      sourceMaps: 'inline',
      filename: path.basename(args.path),
      caller: {
        name: 'mpack-fully-transform-plugin',
        supportsStaticESM: true,
      },
    }) as babel.TransformOptions | null;

    console.log('babel', args.path);
    if (!babelOptions) {
      return { code };
    }

    if (babelOptions.sourceMaps) {
      babelOptions.sourceFileName = path.basename(args.path);
    }

    const result = await babel.transformAsync(code, babelOptions);

    if (result?.code != null) {
      return { code: result.code };
    }

    throw new Error('babel transform result is null');
  };

  defineStepName(fullyTransformStep, 'fully-transform');

  return fullyTransformStep;
}
