import z from 'zod';
import { devServerConfigSchema } from './devServerConfigSchema';
import { servicesConfigSchema } from './servicesConfigSchema';
import { taskConfigSchema } from './taskConfigSchema';
import type { Config } from '../Config';

export const configSchema: z.ZodType<Config> = z.object({
  appName: z.string(),
  scheme: z.string(),
  commands: z.array(z.any()).optional(),
  concurrency: z.number().refine(Number.isInteger).default(4),
  tasks: taskConfigSchema.array(),
  devServer: devServerConfigSchema.optional(),
  services: servicesConfigSchema.optional(),
});
