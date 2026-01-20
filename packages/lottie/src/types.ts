import type { ViewStyle, StyleProp } from 'react-native';

/**
 * Represents a serialized animation generated from After Effects
 */
export interface AnimationObject {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm?: string;
  ddd?: number;
  assets: unknown[];
  layers: unknown[];
  markers?: unknown[];
}

/**
 * Color filter for changing layer colors
 */
export interface ColorFilter {
  keypath: string;
  color: string;
}

/**
 * Text filter for iOS (KeyPath-based)
 */
export interface TextFilterIOS {
  keypath: string;
  text: string;
}

/**
 * Text filter for Android (find-and-replace)
 */
export interface TextFilterAndroid {
  find: string;
  replace: string;
}

/**
 * Resize modes for the animation view
 */
export type ResizeMode = 'cover' | 'contain' | 'center';

/**
 * Render modes for Android hardware acceleration
 */
export type RenderMode = 'AUTOMATIC' | 'HARDWARE' | 'SOFTWARE';

/**
 * Animation source - can be a local asset, remote URL, or JSON object
 */
export type AnimationSource = string | AnimationObject | { uri: string } | number; // require() returns number

/**
 * Callback when animation finishes
 */
export interface AnimationFinishEvent {
  isCancelled: boolean;
}

/**
 * Callback when animation fails to load
 */
export interface AnimationFailureEvent {
  error: string;
}

/**
 * Props for LottieView component
 */
export interface LottieViewProps {
  /**
   * Animation source - required
   * Can be a local asset path, remote URL, JSON object, or require() result
   */
  source: AnimationSource;

  /**
   * Style for the view
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Normalized progress value (0-1)
   */
  progress?: number;

  /**
   * Animation playback speed
   * @default 1
   */
  speed?: number;

  /**
   * Animation duration in milliseconds (overrides source duration)
   */
  duration?: number;

  /**
   * Whether the animation should loop
   * @default true
   */
  loop?: boolean;

  /**
   * Whether the animation should auto-play on mount
   * @default false
   */
  autoPlay?: boolean;

  /**
   * Resize mode for the animation
   * @default 'contain'
   */
  resizeMode?: ResizeMode;

  /**
   * Render mode for Android hardware acceleration
   * @default 'AUTOMATIC'
   * @platform android
   */
  renderMode?: RenderMode;

  /**
   * Array of color filters to apply to animation layers
   */
  colorFilters?: ColorFilter[];

  /**
   * Text filters for iOS (KeyPath-based replacement)
   * @platform ios
   */
  textFiltersIOS?: TextFilterIOS[];

  /**
   * Text filters for Android (find-and-replace)
   * @platform android
   */
  textFiltersAndroid?: TextFilterAndroid[];

  /**
   * Enable merge paths for Android (KitKat and above)
   * @platform android
   */
  enableMergePathsAndroidForKitKatAndAbove?: boolean;

  /**
   * Enable safe mode for Android (catches exceptions)
   * @platform android
   */
  enableSafeModeAndroid?: boolean;

  /**
   * Enable hardware acceleration on Android
   * @platform android
   */
  hardwareAccelerationAndroid?: boolean;

  /**
   * Whether to cache the composition
   * @default true
   */
  cacheComposition?: boolean;

  /**
   * Folder for image assets
   * @platform android
   */
  imageAssetsFolder?: string;

  /**
   * Callback when animation finishes
   */
  onAnimationFinish?: (event: AnimationFinishEvent) => void;

  /**
   * Callback when animation fails to load
   */
  onAnimationFailure?: (event: AnimationFailureEvent) => void;

  /**
   * Callback when animation is loaded
   */
  onAnimationLoaded?: () => void;

  /**
   * Callback when animation loops
   */
  onAnimationLoop?: () => void;

  /**
   * Test ID for E2E testing
   */
  testID?: string;
}

/**
 * Imperative handle for LottieView
 */
export interface LottieViewRef {
  /**
   * Play the animation
   * @param startFrame Optional start frame
   * @param endFrame Optional end frame
   */
  play: (startFrame?: number, endFrame?: number) => void;

  /**
   * Pause the animation
   */
  pause: () => void;

  /**
   * Resume a paused animation
   */
  resume: () => void;

  /**
   * Reset the animation to initial state
   */
  reset: () => void;
}
