import type { HandleFunction } from 'connect';
import { z } from 'zod';

export const mpackConfigScheme = z
  .object({
    devServer: z
      .object({
        middlewares: z.custom<HandleFunction[]>().default([]),
      })
      .optional()
      .default({
        middlewares: [],
      }),
  })
  .optional();

export type MpackConfig = z.infer<typeof mpackConfigScheme>;
