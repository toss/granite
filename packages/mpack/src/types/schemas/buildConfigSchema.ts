import z from 'zod';
import type { AliasConfig, BuildConfig, ProtocolConfig } from '../BuildConfig';

export const esbuildConfigSchema = z.custom<BuildConfig['esbuild']>();

export const babelConfigSchema = z.object({
  configFile: z.string().optional(),
  presets: z.array(z.any()).optional(),
  plugins: z.array(z.any()).optional(),
  conditions: z.array(z.function().returns(z.boolean())).optional(),
});

export const swcConfigSchema = z.object({
  plugins: z.array(z.any()).optional(),
});

export const resolverConfigSchema = z.object({
  alias: z.array(z.custom<AliasConfig>()).optional(),
  protocols: z.custom<ProtocolConfig>().optional(),
});

export const buildConfigSchema = z.object({
  platform: z.enum(['ios', 'android']),
  entry: z.string(),
  outfile: z.string(),
  resolver: resolverConfigSchema.optional(),
  esbuild: esbuildConfigSchema.optional(),
  babel: babelConfigSchema.optional(),
  swc: swcConfigSchema.optional(),
  extra: z.any().optional(),
});

export type EsbuildConfig = z.infer<typeof esbuildConfigSchema>;
export type BabelConfig = z.infer<typeof babelConfigSchema>;
export type SwcConfig = z.infer<typeof swcConfigSchema>;
export type ResolverConfig = z.infer<typeof resolverConfigSchema>;
export type RawBuildConfig = z.infer<typeof buildConfigSchema>;
