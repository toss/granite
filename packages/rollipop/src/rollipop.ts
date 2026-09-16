import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import type { BundlerAdapter, BundlerBuildOption, BuildSuccessResult, GraniteContext } from '@granite-js/config';
import type * as Rollipop from 'rollipop';

const require = createRequire(import.meta.url);

export interface RollipopOptions {
  configFile?: string;
  outdir?: string;
}

export function rollipop(options: RollipopOptions = {}): BundlerAdapter {
  return {
    name: 'rollipop',
    async runBuild(buildOption) {
      const { dev = false, cache = true, platform } = buildOption;
      const context = this.getContext();
      const { runtime, config } = await load(context, options, 'build', buildOption);
      const outdir = path.resolve(
        context.cwd,
        buildOption.outdir ?? options.outdir ?? 'dist',
        buildOption.outdirSuffix ?? ''
      );
      await fs.mkdir(outdir, { recursive: true });
      const startedAt = performance.now();
      const outfile = path.resolve(outdir, buildOption.outfile ?? `bundle.${platform}.js`);
      const sourcemapOutfile = `${outfile}.map`;
      const chunk = await runtime.runBuild(config, {
        platform,
        dev,
        cache,
        outfile,
        sourcemap: true,
        sourcemapOutfile,
        assetsDir: outdir,
      });
      const sourcemap = await fs.readFile(sourcemapOutfile, 'utf8');
      if (buildOption.metafile) {
        console.warn('Rollipop does not emit Mpack metafiles.');
      }
      return {
        errors: [],
        warnings: [],
        outputFiles: undefined,
        metafile: undefined,
        mangleCache: undefined,
        bundle: { source: outputFile(outfile, chunk.code), sourcemap: outputFile(sourcemapOutfile, sourcemap) },
        outfile,
        sourcemapOutfile,
        platform,
        extra: buildOption.extra,
        totalModuleCount: chunk.moduleIds.length,
        duration: performance.now() - startedAt,
        size: Buffer.byteLength(chunk.code),
      } satisfies BuildSuccessResult;
    },
    async runServer(serverOptions) {
      const { runtime, config } = await load(this.getContext(), options, 'serve');
      const { host = 'localhost', port = 8081 } = serverOptions;
      const server = await runtime.runServer(config, { host, port, buildOptions: { cache: serverOptions.cache } });
      try {
        if (serverOptions.interactive !== false) {
          setupInteractiveMode(server, config);
        }
      } catch (error) {
        await server.instance.close();
        throw error;
      }
      return {
        close: async () => {
          await server.instance.close();
        },
      };
    },
  };
}

async function load(
  context: GraniteContext,
  options: RollipopOptions,
  command: 'build' | 'serve',
  buildOption?: BundlerBuildOption
) {
  const runtime = await import('rollipop');
  const config = await runtime.loadConfig({
    cwd: context.cwd,
    configFile: options.configFile,
    mode: command === 'serve' || buildOption?.dev ? 'development' : 'production',
    context: { command: command === 'serve' ? 'start' : 'bundle' },
  });
  const app = JSON.stringify({ name: context.appName, scheme: context.scheme, host: context.host });
  config.polyfills = [
    { type: 'plain', code: `globalThis.__granite = globalThis.__granite || {}; globalThis.__granite.app = ${app};` },
    ...config.polyfills,
  ];
  return { runtime, config };
}

function outputFile(filePath: string, text: string): BuildSuccessResult['bundle']['source'] {
  return { path: filePath, contents: Buffer.from(text), hash: '', text };
}

function setupInteractiveMode(server: Awaited<ReturnType<typeof Rollipop.runServer>>, config: Rollipop.ResolvedConfig) {
  let setup: ((options: { devServer: typeof server; extraCommands: unknown[] }) => void) | undefined;
  try {
    const entry = path.dirname(require.resolve('rollipop'));
    setup = require(path.join(entry, 'node/commands/start/setup-interactive-mode')).setupInteractiveMode;
  } catch {
    return;
  }
  setup?.({ devServer: server, extraCommands: config.terminal?.extraCommands ?? [] });
}
