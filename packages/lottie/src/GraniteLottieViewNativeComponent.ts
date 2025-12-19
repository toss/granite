import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import type {
  ViewProps,
  HostComponent,
  Double,
  Float,
  Int32,
} from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

// Color filter type for native
type ColorFilterNative = Readonly<{
  keypath: string;
  color: string;
}>;

// Text filter for iOS
type TextFilterIOSNative = Readonly<{
  keypath: string;
  text: string;
}>;

// Text filter for Android
type TextFilterAndroidNative = Readonly<{
  find: string;
  replace: string;
}>;

// Event payloads
type AnimationFinishEventData = Readonly<{
  isCancelled: boolean;
}>;

type AnimationFailureEventData = Readonly<{
  error: string;
}>;

type AnimationLoadedEventData = Readonly<object>;

type AnimationLoopEventData = Readonly<object>;

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
  onAnimationFinish?: DirectEventHandler<AnimationFinishEventData>;
  onAnimationFailure?: DirectEventHandler<AnimationFailureEventData>;
  onAnimationLoaded?: DirectEventHandler<AnimationLoadedEventData>;
  onAnimationLoop?: DirectEventHandler<AnimationLoopEventData>;
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
