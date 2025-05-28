import z from 'zod';
import { buildConfigSchema } from './buildConfigSchema';
import type { DevServerConfig } from '../DevServerConfig';

export const devServerConfigSchema: z.ZodType<DevServerConfig> = z.object({
  presets: z.array(z.any()).optional(),
  build: buildConfigSchema.omit({ platform: true, outfile: true }),
});
