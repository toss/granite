import z from 'zod';
import { ServicesConfig } from '../ServicesConfig';

export const servicesConfigSchema: z.ZodType<ServicesConfig> = z.object({
  sentry: z
    .object({
      enabled: z.boolean().optional().default(true),
      authToken: z.string().optional(),
      org: z.string().optional(),
      project: z.string().optional(),
      release: z.any().optional(),
      sourcemap: z.any().optional(),
    })
    .optional(),
});
