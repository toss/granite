import type * as esbuild from 'esbuild';
import z from 'zod';

const callableSchema = <T>(returnType: z.ZodType<T>) =>
  z.function().returns(z.union([returnType, z.promise(returnType)]));

export const esbuildConfigSchema = z.custom<
  esbuild.BuildOptions & {
    /**
     * Entry point 최상단에 주입할 스크립트 경로
     *
     * esbuild.inject 옵션에 추가한 스크립트의 경우 entry-point 모듈에만 주입되는 것이 아니라 모든 모듈에 주입되는 문제가 있음.
     * entry-point 모듈의 최상단에만 코드를 주입하도록 별도 옵션을 구성합니다.
     *
     * - 의도한 것과 같이 entry-point 모듈 최상단에 1회만 주입(import)됩니다
     * - 중복되는 inject 스크립트가 제거되어 번들 크기가 작아집니다
     *
     * @see issue {@link https://github.com/evanw/esbuild/issues/475}
     */
    prelude?: string[];
  }
>();

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
  alias: z
    .array(
      z.object({
        from: z.string(),
        to: z.union([z.string(), callableSchema(z.string())]),
        exact: z.boolean().optional(),
      })
    )
    .optional(),
  protocols: z
    .record(
      z.object({
        resolve: callableSchema(z.any()).optional(),
        load: callableSchema(z.any()),
      })
    )
    .optional(),
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
