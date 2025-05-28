import { BuildConfig } from './BuildConfig';
import type { PresetContext } from './PresetContext';

export type Preset = (context: PresetContext) => Promise<Partial<BuildConfig>> | Partial<BuildConfig>;
