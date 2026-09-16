import * as path from 'node:path';
import type { Plugin, PluginOption } from 'rollipop';
import { compileHbc } from '../shared/compileHbc';
import { writeComposedSourcemap } from '../shared/composeSourcemap';
import { resolveHermesBinaryPath } from '../shared/resolveHermesBinaryPath';
import type { HermesPluginOptions as CompilerOptions } from '../shared/types';

export interface HermesBuildResult {
  platform: string;
  outfile: string;
  sourcemapOutfile: string;
  hbc: string;
  hbcSourcemap: string | null;
}

export interface HermesPluginOptions extends CompilerOptions {
  onBuild?: (result: HermesBuildResult) => void | Promise<void>;
}

interface HermesBuildContext {
  readonly dev: boolean;
  readonly platform: string;
}

export function hermes(options: HermesPluginOptions = {}): PluginOption {
  const contextByOutput = new Map<string, HermesBuildContext>();
  const state = { root: process.cwd() };

  return [
    createHermesConfigPlugin(state, contextByOutput),
    createHermesCompilerPlugin(options, state, contextByOutput),
  ];
}

function createHermesConfigPlugin(state: { root: string }, contextByOutput: Map<string, HermesBuildContext>): Plugin {
  return {
    name: 'granite:hermes:config',
    config(config) {
      state.root = config.root ?? process.cwd();
      return {
        // Hermes optimizes the bytecode itself and needs unminified JS for accurate source maps.
        output: { minify: false },
        rolldownOptions(options, { dev, platform }) {
          if (options.output?.file) {
            contextByOutput.set(path.resolve(state.root, options.output.file), { dev, platform });
          }
          return options;
        },
      };
    },
  };
}

function createHermesCompilerPlugin(
  { onBuild, binaryPath, ...compilerOptions }: HermesPluginOptions,
  state: { root: string },
  contextByOutput: Map<string, HermesBuildContext>
): Plugin {
  return {
    name: 'granite:hermes:compile',
    writeBundle: {
      order: 'pre',
      sequential: true,
      async handler(output) {
        if (!output.file) {
          throw new Error('Hermes compilation requires an output file.');
        }
        const outfile = path.resolve(state.root, output.file);
        const context = contextByOutput.get(outfile);
        if (context == null) {
          throw new Error(`Hermes build context is missing for ${outfile}.`);
        }
        if (context.dev) {
          return;
        }

        const sourcemapOutfile = `${outfile}.map`;
        const hbcFile = `${outfile.slice(0, outfile.length - path.extname(outfile).length)}.hbc`;
        const result = await compileHbc({
          ...compilerOptions,
          hermesc: binaryPath ?? resolveHermesBinaryPath(state.root),
          jsBundle: outfile,
          outfile: hbcFile,
        });
        if (result.hbcSourcemap) {
          await writeComposedSourcemap(sourcemapOutfile, result.hbcSourcemap);
        }
        await onBuild?.({ platform: context.platform, outfile, sourcemapOutfile, ...result });
      },
    },
  };
}
