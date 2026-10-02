import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import type { BundlerAdapter, BundlerBuildOption, BuildOutputFile, GraniteContext } from '@granite-js/config';
import type * as Rollipop from 'rollipop';

const require = createRequire(import.meta.url);

export interface RollipopOptions {
  configFile?: string;
  outdir?: string;
}

export function rollipop(options: RollipopOptions = {}): BundlerAdapter {
  return {
    name: 'rollipop',
    async resetCache() {
      const bundler = await import('rollipop');
      await bundler.resetCache();
    },
    async runBuild(buildOption) {
      const { dev = false, cache = true, platform } = buildOption;
      const context = this.getContext();
      const { bundler, config } = await load(context, options, 'build', buildOption);
      const outdir = path.resolve(
        context.cwd,
        buildOption.outdir ?? options.outdir ?? 'dist',
        buildOption.outdirSuffix ?? ''
      );
      await fs.mkdir(outdir, { recursive: true });
      const startedAt = performance.now();
      const outfile = path.resolve(outdir, buildOption.outfile ?? `bundle.${platform}.js`);
      const sourcemapOutfile = `${outfile}.map`;
      const chunk = await bundler.runBuild(config, {
        platform,
        dev,
        cache,
        outfile,
        sourcemap: true,
        sourcemapOutfile,
        assetsDir: outdir,
      });
      const sourcemap = await fs.readFile(sourcemapOutfile, 'utf8');
      return {
        bundle: { source: outputFile(outfile, chunk.code), sourcemap: outputFile(sourcemapOutfile, sourcemap) },
        outfile,
        sourcemapOutfile,
        platform,
        extra: buildOption.extra,
        totalModuleCount: chunk.moduleIds.length,
        duration: performance.now() - startedAt,
        size: Buffer.byteLength(chunk.code),
      };
    },
    async runServer(serverOptions) {
      const { bundler, config } = await load(this.getContext(), options, 'serve');
      if (serverOptions.clientLogs !== true) {
        console.log(
          [
            'Client logs have been disabled.',
            `To enable client logs, set the '--client-logs' flag when running the dev server.`,
          ].join('\n')
        );
        config.reporter = { update() {} };
      }
      const { host = 'localhost', port = 8081 } = serverOptions;
      const server = await bundler.runServer(config, { host, port, buildOptions: { cache: serverOptions.cache } });
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
  const bundler = await import('rollipop');
  const config = await bundler.loadConfig({
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
  return { bundler, config };
}

function outputFile(filePath: string, text: string): BuildOutputFile {
  return { path: filePath, contents: Buffer.from(text), text };
}

function setupInteractiveMode(server: Awaited<ReturnType<typeof Rollipop.runServer>>, config: Rollipop.ResolvedConfig) {
  let setup:
    | ((options: { devServer: typeof server; commands?: Rollipop.ResolvedConfig['commands'] }) => void)
    | undefined;
  try {
    const entry = path.dirname(require.resolve('rollipop'));
    // https://github.com/rollipop-dev/rollipop/blob/main/packages/rollipop/src/node/commands/start/setup-interactive-mode.ts
    setup = require(path.join(entry, 'node/commands/start/setup-interactive-mode')).setupInteractiveMode;
  } catch {
    return;
  }
  setup?.({ devServer: server, commands: config.commands });
}
