import type { ViewProps, HostComponent } from 'react-native';
import {
  type Int32,
  type Float,
  type Double,
  type DirectEventHandler,
  type WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

// Color filter type for native
interface ColorFilterNative {
  keypath: string;
  color: string;
}

// Text filter for iOS
interface TextFilterIOSNative {
  keypath: string;
  text: string;
}

// Text filter for Android
interface TextFilterAndroidNative {
  find: string;
  replace: string;
}

export interface NativeProps extends ViewProps {
  // Animation source
  sourceName?: string;
  sourceJson?: string;
  sourceURL?: string;
  sourceDotLottieURI?: string;

  // Animation control
  progress?: Float;
  speed?: Double;
  loop?: WithDefault<boolean, true>;
  autoPlay?: WithDefault<boolean, false>;

  // Layout & Rendering
  resizeMode?: WithDefault<string, 'contain'>;
  renderMode?: WithDefault<string, 'AUTOMATIC'>;
  imageAssetsFolder?: string;

  // Platform-specific (Android)
  enableMergePathsAndroidForKitKatAndAbove?: boolean;
  enableSafeModeAndroid?: boolean;
  hardwareAccelerationAndroid?: boolean;
  cacheComposition?: WithDefault<boolean, true>;

  // Filters
  colorFilters?: ReadonlyArray<ColorFilterNative>;
  textFiltersIOS?: ReadonlyArray<TextFilterIOSNative>;
  textFiltersAndroid?: ReadonlyArray<TextFilterAndroidNative>;

  // Events
  onAnimationFinish?: DirectEventHandler<{
    isCancelled: boolean;
  }>;
  onAnimationFailure?: DirectEventHandler<{
    error: string;
  }>;
  onAnimationLoaded?: DirectEventHandler<null>;
  onAnimationLoop?: DirectEventHandler<null>;
}

export interface NativeCommands {
  play: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    startFrame: Int32,
    endFrame: Int32
  ) => void;
  pause: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  resume: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  reset: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['play', 'pause', 'resume', 'reset'],
});

export default codegenNativeComponent<NativeProps>(
  'GraniteLottieView'
) as HostComponent<NativeProps>;
