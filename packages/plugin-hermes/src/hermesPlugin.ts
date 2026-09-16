import { isBuildSuccess, type GranitePluginCore } from '@granite-js/plugin-core';
import { compileHbc, type CompileHbcResult } from './shared/compileHbc';
import { writeComposedSourcemap } from './shared/composeSourcemap';
import { resolveHermesBinaryPath } from './shared/resolveHermesBinaryPath';
import type { HermesPluginOptions } from './shared/types';

export const hermesPlugin = (options?: HermesPluginOptions): GranitePluginCore => {
  const hermesc = options?.binaryPath ?? resolveHermesBinaryPath();

  return {
    name: 'hermes-plugin',
    build: {
      order: 'post',
      handler: async function (config) {
        const hermesResult: CompileHbcResult[] = [];
        const files = config.buildResults.filter(isBuildSuccess).map(({ outfile, sourcemapOutfile }) => ({
          jsBundle: outfile,
          jsSourcemap: sourcemapOutfile,
          hermesBytecode: outfile.replace(/\.js$/, '.hbc'),
        }));

        for (const file of files) {
          const { jsBundle, jsSourcemap, hermesBytecode } = file;
          const { hbc, hbcSourcemap } = await compileHbc({ hermesc, jsBundle, outfile: hermesBytecode, ...options });

          if (hbcSourcemap != null) {
            await writeComposedSourcemap(jsSourcemap, hbcSourcemap);
          }

          hermesResult.push({ hbc, hbcSourcemap });
        }

        this.meta.hermes = hermesResult;
      },
    },
    config: {
      esbuild: {
        /**
         * Hermes doesn't need minified input.
         * Hermes sourcemap generation depends on JS bundle string offsets, so a minified bundle may produce incorrect sourcemaps.
         *
         * @see {@link https://github.com/facebook/hermes/issues/452#issuecomment-776816638}
         * @see {@link https://github.com/facebook/hermes/issues/945#issuecomment-1975250261}
         */
        minify: false,
      },
    },
  };
};
