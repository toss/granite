import type { BuildConfig } from './BuildConfig';
import type { Preset } from './Preset';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type INTERNAL__Id = string & { __id: true };

export interface TaskConfig {
  /**
   * 작업 식별자
   */
  tag: string;
  /**
   * Mpack 내에 사전 구성된 프리셋
   */
  presets?: Preset[];
  build: BuildConfig;
}
