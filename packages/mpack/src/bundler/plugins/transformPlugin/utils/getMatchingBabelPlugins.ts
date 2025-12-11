import type { BabelConfig } from '@granite-js/plugin-core';

export interface MatchedBabelOptions {
  plugins: (string | [string, any])[];
  presets: (string | [string, any])[];
}

/**
 * Collects plugins and presets from all matching babel rules
 */
export function getMatchingBabelOptions(
  babel: BabelConfig | undefined,
  code: string,
  path: string,
  dev: boolean
): MatchedBabelOptions {
  if (!babel?.rules?.length) {
    return { plugins: [], presets: [] };
  }

  const matchedPlugins: (string | [string, any])[] = [];
  const matchedPresets: (string | [string, any])[] = [];

  for (const rule of babel.rules) {
    if (rule.if({ code, path, dev })) {
      if (rule.plugins) {
        matchedPlugins.push(...rule.plugins);
      }
      if (rule.presets) {
        matchedPresets.push(...rule.presets);
      }
    }
  }

  return { plugins: matchedPlugins, presets: matchedPresets };
}
