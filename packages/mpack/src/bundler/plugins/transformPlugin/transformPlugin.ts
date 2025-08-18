import assert from 'assert';
import * as fs from 'fs/promises';
import { Plugin } from 'esbuild';
import { PluginOptions } from '../types';
import * as preludeScript from './helpers/preludeScript';
import { createCacheSteps } from './steps/createCacheSteps';
import { createCodegenStep } from './steps/createCodegenStep';
import { createFlowStripStep } from './steps/createFlowStripStep';
import { createFullyTransformStep } from './steps/createFullyTransformStep';
import { createTransformToHermesSyntaxStep } from './steps/createTransformToHermesSyntaxStep';
import { Performance } from '../../../performance';
import { AsyncTransformPipeline } from '../../../transformer';

interface TransformPluginOptions {
  transformSync?: (id: string, code: string) => string;
  transformAsync?: (id: string, code: string) => Promise<string>;
}

const sourceRegExp = /\.([mc]js|[tj]sx?)$/;

export function transformPlugin({ context, ...options }: PluginOptions<TransformPluginOptions>): Plugin {
  return {
    name: 'transform-plugin',
    setup(build) {
      const { id, config } = context;
      const { dev, cache, buildConfig } = config;
      const { esbuild, swc, babel } = buildConfig;

      assert(id, 'id 값이 존재하지 않습니다');
      assert(typeof dev === 'boolean', 'dev 값이 존재하지 않습니다');
      assert(typeof cache === 'boolean', 'cache 값이 존재하지 않습니다');

      const cacheSteps = createCacheSteps({ id, enabled: cache });
      const transformPipeline = new AsyncTransformPipeline()
        .beforeStep(cacheSteps.beforeTransform)
        .addStep(async (code, args) => {
          if (options.transformSync) {
            code = options.transformSync(args.path, code);
          }

          if (options.transformAsync) {
            code = await options.transformAsync(args.path, code);
          }

          return { code };
        })
        .addStep({
          if: ({ path, code }) => babel?.conditions?.some((cond) => cond(code, path)) ?? false,
          then: createFullyTransformStep({ dev, additionalBabelOptions: babel }),
          stopAfter: true,
        })
        .addStep({
          if: ({ path }) => /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/.test(path),
          then: createCodegenStep(),
          else: createFlowStripStep(),
        })
        .addStep(createTransformToHermesSyntaxStep({ dev, additionalSwcOptions: swc }))
        .afterStep(cacheSteps.afterTransform);

      preludeScript.registerEntryPointMarker(build);
      preludeScript.registerPreludeScriptResolver(build);

      /**
       * 구성한 transform pipeline 에 원본 코드를 전달하여 변환 처리
       */
      build.onLoad({ filter: sourceRegExp }, async (args) => {
        try {
          let code = await fs.readFile(args.path, 'utf-8');

          if (preludeScript.isEntryPoint(args)) {
            code = preludeScript.injectPreludeScript(code, {
              preludeScriptPaths: esbuild?.prelude ?? [],
            });
          }

          const result = await Performance.withTrace(() => transformPipeline.transform(code, args), {
            name: 'transform',
            startOptions: { detail: { file: args.path } },
          });

          return { contents: result.code, loader: 'js' };
        } catch (error) {
          const err = error as any;

          return {
            errors: [
              {
                text: err.message || 'Transform failed',
                location: err.location || {
                  file: args.path,
                  namespace: 'file',
                  line: 1,
                  column: 0,
                },
                detail: err.detail,
              },
            ],
          };
        }
      });
    },
  };
}
