import * as esbuild from 'esbuild';
import { BundleData } from '../../bundler/types';
import { INTERNAL_LOAD_REMOTE_IDENTIFIER, INTERNAL_NAMESPACE_IDENTIFIER } from '../../constants';
import { getBundleName } from '../../utils/getBundleName';
import { getSourcemapName } from '../../utils/getSourcemapName';
import { DEV_SERVER_BUNDLE_NAME } from '../constants';
import { Platform } from '../types';

const INTERNAL_SOURCE = 'mpack:internal';
const IMPORT_SOURCE = 'mpack:remote';

export async function mergeBundles({
  platform,
  hostBundleContent,
  remoteBundleContent,
}: {
  platform: Platform;
  hostBundleContent: string;
  remoteBundleContent: string;
}): Promise<BundleData> {
  const bundleName = getBundleName(DEV_SERVER_BUNDLE_NAME);
  const sourcemapName = getSourcemapName(bundleName);
  const result = await esbuild.build({
    logLevel: 'silent',
    stdin: {
      contents: [`require('${INTERNAL_SOURCE}');`, hostBundleContent].join('\n'),
      loader: 'js',
    },
    outfile: bundleName,
    bundle: true,
    write: false,
    minify: false,
    treeShaking: false,
    sourcemap: 'external',
    sourcesContent: true,
    define: {
      global: 'window',
    },
    footer: {
      /**
       * 소스맵 옵션을 `external`로 지정하여 번들 코드 하단에 `#sourceMappingURL=path` 을 붙이지 않도록 하고,
       * `footer` 옵션을 통해 개발 서버의 소스맵 주소(상대경로)로 매핑되도록 직접 추가함.
       *
       * - eg. `/index.bundle.map?platform=<platform>&dev=true`
       *
       * @see {@link https://esbuild.github.io/api/#sourcemap}
       * @see {@link https://esbuild.github.io/api/#footer}
       */
      js: `//# sourceMappingURL=/${sourcemapName}?${new URLSearchParams({
        platform,
        dev: JSON.stringify(true),
      }).toString()}`,
    },
    plugins: [
      {
        name: 'remote-bundle-loader',
        setup(build) {
          build.onResolve({ filter: new RegExp(`^${INTERNAL_SOURCE}$`) }, () => ({
            path: 'dev-server-runtime',
            namespace: 'DEV_SERVER_RUNTIME',
          }));

          build.onResolve({ filter: new RegExp(`^${IMPORT_SOURCE}$`) }, () => ({
            path: 'remote-bundle',
            namespace: 'REMOTE_BUNDLE',
          }));

          build.onLoad({ filter: /.*/, namespace: 'DEV_SERVER_RUNTIME' }, () => ({
            contents: `
            (function(global) {
              global.${INTERNAL_NAMESPACE_IDENTIFIER} = {};
              global.${INTERNAL_NAMESPACE_IDENTIFIER}.${INTERNAL_LOAD_REMOTE_IDENTIFIER} = function INTERNAL__loadRemote() {
                require('${IMPORT_SOURCE}');
                return Promise.resolve();
              }
            })(
              typeof globalThis !== 'undefined'
                ? globalThis
                : typeof global !== 'undefined'
                  ? global
                  : typeof window !== 'undefined'
                    ? window
                    : this
            );
            `,
            loader: 'js',
          }));

          build.onLoad({ filter: /.*/, namespace: 'REMOTE_BUNDLE' }, () => ({
            contents: remoteBundleContent,
            loader: 'js',
          }));
        },
      },
    ],
  });

  const sourceFile = result.outputFiles.find((file) => file.path.endsWith(bundleName));
  const sourcemapFile = result.outputFiles.find((file) => file.path.endsWith(sourcemapName));

  if (sourceFile && sourcemapFile) {
    return { source: sourceFile, sourcemap: sourcemapFile };
  }

  throw new Error('failed to merge bundle');
}
