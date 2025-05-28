import { cosmiconfig } from 'cosmiconfig';
import type { BundlerConfig } from '../types';
import { configSchema } from '../types/schemas';

export async function loadConfig({ rootDir }: Pick<BundlerConfig, 'rootDir'>) {
  const explorer = await cosmiconfig('mpack');
  const result = await explorer.search(rootDir);

  if (result == null) {
    return null;
  }

  return configSchema.parse(result.config);
}
