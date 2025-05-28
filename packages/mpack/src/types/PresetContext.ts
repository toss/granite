import type { BundlerConfig } from './BundlerConfig';

export type PresetContext = Pick<BundlerConfig, 'rootDir' | 'appName' | 'scheme' | 'dev'>;
