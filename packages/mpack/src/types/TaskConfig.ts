import type { BuildConfig } from './BuildConfig';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type INTERNAL__Id = string & { __id: true };

export interface TaskConfig {
  /**
   * 작업 식별자
   */
  tag: string;
  build: BuildConfig;
}
