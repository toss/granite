import type { GranitePluginCore } from '@granite-js/plugin-core';
import { compileHbc, type CompileHbcResult } from './compileHbc';
import { writeComposedSourcemap } from './composeSourcemap';
import { resolveHermesBinaryPath } from './resolveHermesBinaryPath';
import type { HermesPluginOptions } from './types';

export const hermesPlugin = (options?: HermesPluginOptions): GranitePluginCore => {
  const hermesc = resolveHermesBinaryPath();

  return {
    name: 'hermes-plugin',
    build: {
      order: 'post',
      handler: async function (config) {
        const hermesResult: CompileHbcResult[] = [];
        const files = config.buildResults.map(({ outfile, sourcemapOutfile }) => ({
          jsBundle: outfile,
          jsSourcemap: sourcemapOutfile,
          hermesBytecode: `${outfile.replace('.js', '')}.hbc`,
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
         * Hermes sourcemap generation logic is affected by the JS bundle string offset, so minified bundle may cause problems with sourcemaps.
         *
         * @see {@link https://github.com/facebook/hermes/issues/452#issuecomment-776816638}
         * @see {@link https://github.com/facebook/hermes/issues/945#issuecomment-1975250261}
         */
        minify: false,
      },
    },
  };
};
