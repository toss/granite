import type { AnimationObject } from '@granite-js/native/lottie-react-native';

type AnimationObjectWithFonts = AnimationObject & {
  fonts?: { list?: unknown[] };
};

export function hasFonts(animationData: AnimationObject): boolean {
  const data = animationData as AnimationObjectWithFonts;
  return Array.isArray(data.fonts?.list) && data.fonts.list.length > 0;
}

export function ensureSafeLottie(animationData: AnimationObject): AnimationObject {
  const { fonts, ...safeData } = animationData as AnimationObjectWithFonts;
  return safeData as AnimationObject;
}
