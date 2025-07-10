import crypto from 'crypto';
import fs from 'fs';
import { join } from 'path';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import { getPackageRoot, prepareLocalDirectory } from '@granite-js/utils';
import { generateEnvType } from './generateEnvType';
import { getRuntimeEnvScript } from './getRuntimeEnvScript';
import type { SerializableObject } from './types';

interface EnvPluginOptions {
  /**
   * Automatically generate `env.d.ts` file.
   *
   * Defaults to `true`.
   */
  dts?: boolean;
}

const DEFAULT_OPTIONS: Required<EnvPluginOptions> = {
  dts: true,
};

export const envPlugin = (environments: SerializableObject, options?: EnvPluginOptions): GranitePluginCore => {
  const completeOptions = { ...DEFAULT_OPTIONS, ...options };
  const packageRoot = getPackageRoot();
  const script = getRuntimeEnvScript(environments);
  const hash = crypto.createHash('sha256').update(script).digest('hex').slice(0, 8);

  const localDir = prepareLocalDirectory(packageRoot);
  const envFilePath = join(localDir, `.granite-${hash}.env.js`);

  const setup = () => {
    fs.writeFileSync(envFilePath, script, 'utf-8');
    if (completeOptions.dts) {
      generateEnvType(packageRoot, environments);
    }
  };

  return {
    name: 'env-plugin',
    build: {
      order: 'pre',
      handler: setup,
    },
    dev: {
      order: 'pre',
      handler: setup,
    },
    transformSync(id, code) {
      if(id === '파일명') {
        const injectCode = fs.readFile
        return [code, injectCode].join('\n');
      }
      return code;
    },
    config: {
      metro: {
        serializer: {
          getPolyfills: () => [envFilePath],
        },
      },
      esbuild: {
        define: {
          'import.meta.env': JSON.stringify(environments),
        },
      },
      babel: {
        plugins: [
          /**
           * This babel plugin is only using in Metro environment (CommonJS).
           * Resolve `.cjs` file to avoid the error below.
           *
           * - `[BABEL]: You appear to be using a native ECMAScript module plugin, which is only supported when running Babel asynchronously.
           */
          require.resolve('./plugins/babel.cjs'),
        ],
      },
    },
  };
};
