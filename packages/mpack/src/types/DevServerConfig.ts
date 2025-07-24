import type { BuildConfig } from './BuildConfig';

export interface DevServerConfig {
  build: Omit<BuildConfig, 'platform' | 'outfile'>;
}
