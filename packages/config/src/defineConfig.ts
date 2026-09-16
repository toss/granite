import * as path from 'node:path';
import { getPackageRoot } from '@granite-js/utils';
import * as z from 'zod';
import type { BundlerAdapter, BundlerAdapterContext, GraniteConfig, ResolvedGraniteConfig } from './adapter/bundler';

const schema = z.strictObject({
  cwd: z.string().optional(),
  appName: z.string().min(1),
  scheme: z.string().min(1),
  host: z.string().default(''),
  bundler: z.custom<BundlerAdapter>((value) => {
    const adapter = value as Partial<BundlerAdapter> | null;
    return (
      adapter != null &&
      typeof adapter.name === 'string' &&
      typeof adapter.runBuild === 'function' &&
      typeof adapter.runServer === 'function'
    );
  }, 'Expected a bundler adapter, such as mpack() or rollipop().'),
});

export function defineConfig(config: GraniteConfig): ResolvedGraniteConfig {
  const { bundler, ...parsed } = schema.parse(config);
  const context = Object.freeze({ ...parsed, cwd: path.resolve(parsed.cwd ?? getPackageRoot()) });
  const adapterContext: BundlerAdapterContext = Object.freeze({ getContext: () => context });
  return {
    ...context,
    bundler: {
      name: bundler.name,
      runBuild: (option) => bundler.runBuild.call(adapterContext, option),
      runServer: (options) => bundler.runServer.call(adapterContext, options),
    },
  };
}
