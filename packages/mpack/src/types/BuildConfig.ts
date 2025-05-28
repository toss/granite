import * as swc from '@swc/core';
import * as esbuild from 'esbuild';

export interface BuildConfig {
  /**
   * 빌드 타겟 플랫폼
   */
  platform: 'ios' | 'android';
  /**
   * 빌드 진입점 파일 경로
   */
  entry: string;
  /**
   * 빌드 결과 파일 경로
   */
  outfile: string;
  /**
   * 소스맵 결과 파일 경로
   *
   * @default `${outfile}.map`
   */
  sourcemapOutfile?: string;
  /**
   * 모듈 resolution 구성
   */
  resolver?: {
    /**
     * 의존성 alias 구성
     */
    alias?: AliasConfig[];
    /**
     * 커스텀 모듈 Protocol 구성
     */
    protocols?: ProtocolConfig;
  };
  /**
   * 커스텀 Transform 구성
   */
  transformSync?: (id: string, code: string) => string;
  transformAsync?: (id: string, code: string) => Promise<string>;
  /**
   * esbuild 구성
   */
  esbuild?: esbuild.BuildOptions & {
    /**
     * Entry point 최상단에 주입할 스크립트 경로
     *
     * esbuild.inject 옵션에 추가한 스크립트의 경우 entry-point 모듈에만 주입되는 것이 아니라 모든 모듈에 주입되는 문제가 있음.
     * entry-point 모듈의 최상단에만 코드를 주입하도록 별도 옵션을 구성합니다.
     *
     * - 의도한 것과 같이 entry-point 모듈 최상단에 1회만 주입(import)됩니다
     * - 중복되는 inject 스크립트가 제거되어 번들 크기가 작아집니다
     *
     * @see issue {@link https://github.com/evanw/esbuild/issues/475}
     */
    prelude?: string[];
  };
  /**
   * 커스텀 babel 구성
   */
  babel?: {
    /**
     * Babel transform 처리를 위한 규칙 리스트
     * (속도가 느리기 때문에 특정 조건이 충족할 때에만 transform 하기 위한 옵션)
     *
     * 모든 규칙이 `false`를 반환할 경우 Babel transform 과정을 건너뜁니다
     */
    conditions?: Array<(code: string, path: string) => boolean>;
    configFile?: string;
    presets?: string[];
    plugins?: (string | [string, any])[];
  };
  /**
   * 커스텀 swc 구성
   */
  swc?: {
    /**
     * 플러그인 바이너리(wasm) 경로, 플러그인 구성
     */
    plugins?: NonNullable<swc.JscConfig['experimental']>['plugins'];
  };
  /**
   * 추가 데이터
   *
   * 작업 결과 데이터에 포함되며, 특정 값을 기반으로 후처리 하기 위한 목적으로 사용
   * (eg. 프리셋에서 특정 extra 데이터를 추가해주고, 결과에서 어떤 프리셋으로 빌드되었는지 구분)
   *
   * ```js
   * const result = new Bundler({
   *   bundlerConfig: {
   *     buildConfig: {
   *       extra: {
   *         reanimated: 3,
   *       },
   *     },
   *   },
   *   ...
   * }).build();
   *
   * if (result.extra?.reanimated === 3) {
   *   // reav3 에 대한 빌드 결과물 처리
   * }
   * ```
   */
  extra?: any;
}

export interface AliasConfig {
  /**
   * 치환 대상 모듈 경로
   */
  from: string;
  /**
   * 치환할 모듈 경로 혹은 모듈 경로를 반환하는 함수
   */
  to:
    | string
    | ((context: { args: esbuild.OnResolveArgs; resolve: esbuild.PluginBuild['resolve'] }) => string | Promise<string>);
  /**
   * - `false`: (기본값) subpath 가 존재해도 치환합니다 (`^name(?:$|/)`)
   * - `true`: 완벽히 일치하는 대상만 치환합니다 (`^name$`)
   *
   * ```js
   * const config = {
   *   alias: [
   *    { from: 'react-native', to: 'react-native-0.68' },
   *    { from: 'react', to: 'react-17', exact: true },
   *   ],
   * };
   *
   * // AS IS
   * import * as RN from 'react-native';
   * import 'react-native/Libraries/Core/InitializeCore';
   * import React from 'react';
   * import runtime from 'react/runtime';
   *
   * // TO BE
   * import * as RN from 'react-native-0.68';
   * import 'react-native-0.68/Libraries/Core/InitializeCore';
   * import React from 'react-17';
   * import runtime from 'react/runtime'; // exact
   * ```
   */
  exact?: boolean;
}

/**
 * 커스텀 프로토콜 Resolve 구성
 *
 * 지정한 프로토콜로 참조하는 모듈을 직접 resolve, load 할 수 있도록 구성하는 옵션입니다
 *
 * ```ts
 * // AS-IS
 * import mod from 'custom-protocol:/path/to/module';
 *
 * // TO-BE
 * // `custom-protocol:/path/to/module` 모듈은 아래와 같이 처리됨
 * export default global.__import('/path/to/module');
 * ```
 *
 * 구성 예시
 *
 * ```ts
 * {
 *   'custom-protocol': {
 *     resolve: (args) => args.path,
 *     load: (args) => {
 *       return { loader: 'ts', contents: `export default global.__import('${args.path}')` };
 *     },
 *   },
 * }
 * ```
 */
export interface ProtocolConfig {
  [name: string]: {
    /**
     * Resolve 할 모듈 경로
     */
    resolve?: (args: esbuild.OnResolveArgs) => string | Promise<string>;
    /**
     * Resolve 된 경로를 기준으로 모듈 코드를 반환
     */
    load: (args: esbuild.OnLoadArgs) => esbuild.OnLoadResult | Promise<esbuild.OnLoadResult>;
  };
}
