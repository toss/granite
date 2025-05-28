import type { BuildConfig } from './BuildConfig';
import type { Preset } from './Preset';

export interface DevServerConfig {
  /**
   * 사전 구성된 프리셋
   */
  presets?: Preset[];
  build: Omit<BuildConfig, 'platform' | 'outfile'>;
}
