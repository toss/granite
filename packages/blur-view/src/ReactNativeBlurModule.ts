import type { BlurView, VibrancyView } from '@granite-js/native/@react-native-community/blur';
import { isBlurNativeModuleSupported } from './constants';

const ReactNativeBlurModule = (() => {
  if (!isBlurNativeModuleSupported) {
    return undefined;
  }

  try {
    return require('@granite-js/native/@react-native-community/blur') as {
      BlurView: typeof BlurView;
      VibrancyView: typeof VibrancyView;
    };
  } catch {
    return undefined;
  }
})();

export { ReactNativeBlurModule };
