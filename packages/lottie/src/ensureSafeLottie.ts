import type { AnimationObject } from '@granite-js/native/lottie-react-native';
import { Platform } from 'react-native';

type LottieAnimationObject = AnimationObject & { fonts: { list: unknown[] } };

/**
 * On Android, crashes occur when there are custom fonts in fonts.list.
 * Therefore, we clear the contents of fonts.list for Android.
 */
export function ensureSafeLottie(jsonData: LottieAnimationObject): LottieAnimationObject {
  if (Platform.OS === 'android') {
    return {
      ...jsonData,
      fonts: {
        list: [],
      },
    };
  } else {
    return jsonData;
  }
}

export function hasFonts(jsonData: LottieAnimationObject) {
  if (jsonData && 'fonts' in jsonData) {
    if ('list' in jsonData.fonts) {
      return jsonData.fonts.list.length > 0;
    }
  }

  return false;
}
