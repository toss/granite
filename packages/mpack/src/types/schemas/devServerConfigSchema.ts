import z from 'zod';
import { buildConfigSchema } from './buildConfigSchema';
import type { DevServerConfig } from '../DevServerConfig';

export const devServerConfigSchema: z.ZodType<DevServerConfig> = z.object({
  build: buildConfigSchema.omit({ platform: true, outfile: true }),
});
