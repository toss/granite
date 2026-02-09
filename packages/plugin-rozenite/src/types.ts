import type { RozeniteConfig } from '@rozenite/middleware';

export type RozenitePluginOptions = {
  /**
   * Whether to enable Rozenite middleware in dev server.
   * @default true
   */
  enabled?: boolean;
} & Omit<RozeniteConfig, 'projectRoot'>;
