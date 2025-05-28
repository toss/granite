import z from 'zod';
import { buildConfigSchema } from './buildConfigSchema';
import { BundlerConfig } from '../BundlerConfig';

export const bundlerConfigSchema: z.ZodType<BundlerConfig> = z.object({
  tag: z.string(),
  rootDir: z.string(),
  appName: z.string(),
  scheme: z.string(),
  buildConfig: buildConfigSchema,
  env: z.enum(['local', 'alpha', 'staging', 'live']),
  dev: z.boolean(),
  cache: z.boolean(),
  metafile: z.boolean(),
  services: z.any(),
});
