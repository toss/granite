import z from 'zod';
import { buildConfigSchema } from './buildConfigSchema';
import type { TaskConfig } from '../TaskConfig';

export const taskConfigSchema: z.ZodType<TaskConfig> = z.object({
  tag: z.string(),
  extra: z.any().optional(),
  build: buildConfigSchema,
});
