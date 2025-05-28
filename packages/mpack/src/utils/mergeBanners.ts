import { BuildOptions } from 'esbuild';

type Banner = { [type: string]: string | false };

export function mergeBanners(baseBanner: Banner, overrideBanner: Banner) {
  const result = { ...baseBanner };

  for (const [key, value] of Object.entries(overrideBanner)) {
    result[key] = `${result[key] ?? ''}\n${value}`;
  }

  return result as BuildOptions['banner'];
}
