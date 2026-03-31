import React, { forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from 'react';
import { Image, type NativeSyntheticEvent, Platform } from 'react-native';
import NativeGraniteLottieView, {
  Commands,
  OnAnimationFailureEvent,
  OnAnimationFinishEvent,
  type NativeProps,
} from './GraniteLottieViewNativeComponent';
import type { LottieViewProps, LottieViewRef, AnimationSource, AnimationObject } from './types';

// Helper to resolve animation source
function resolveSource(source: AnimationSource): {
  sourceName?: string;
  sourceJson?: string;
  sourceURL?: string;
  sourceDotLottieURI?: string;
} {
  if (typeof source === 'number') {
    // require() result - resolve to local asset
    const resolved = Image.resolveAssetSource(source);
    if (resolved?.uri) {
      if (resolved.uri.endsWith('.lottie')) {
        return { sourceDotLottieURI: resolved.uri };
      }
      return { sourceURL: resolved.uri };
    }
    return {};
  }

  if (typeof source === 'string') {
    // String path or URL
    if (source.startsWith('http://') || source.startsWith('https://')) {
      if (source.endsWith('.lottie')) {
        return { sourceDotLottieURI: source };
      }
      return { sourceURL: source };
    }
    // Local asset name
    return { sourceName: source };
  }

  if (typeof source === 'object' && source !== null) {
    if ('uri' in source) {
      // { uri: string } format
      const uri = source.uri;
      if (uri.endsWith('.lottie')) {
        return { sourceDotLottieURI: uri };
      }
      return { sourceURL: uri };
    }
    // AnimationObject - serialize to JSON
    return { sourceJson: JSON.stringify(source as AnimationObject) };
  }

  return {};
}

/**
 * LottieView - Pluggable Lottie animation component for React Native
 */
export const LottieView = forwardRef<LottieViewRef, LottieViewProps>((props, ref) => {
  const {
    source,
    style,
    progress,
    speed = 1,
    duration,
    loop = true,
    autoPlay = false,
    resizeMode = 'contain',
    renderMode = 'AUTOMATIC',
    colorFilters,
    textFiltersIOS,
    textFiltersAndroid,
    enableMergePathsAndroidForKitKatAndAbove,
    enableSafeModeAndroid,
    hardwareAccelerationAndroid,
    cacheComposition = true,
    imageAssetsFolder,
    onAnimationFinish,
    onAnimationFailure,
    onAnimationLoaded,
    onAnimationLoop,
    testID,
    ...restProps
  } = props;

  const nativeRef = useRef<React.ElementRef<typeof NativeGraniteLottieView>>(null);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    play: (startFrame?: number, endFrame?: number) => {
      if (nativeRef.current) {
        Commands.play(nativeRef.current, startFrame ?? -1, endFrame ?? -1);
      }
    },
    pause: () => {
      if (nativeRef.current) {
        Commands.pause(nativeRef.current);
      }
    },
    resume: () => {
      if (nativeRef.current) {
        Commands.resume(nativeRef.current);
      }
    },
    reset: () => {
      if (nativeRef.current) {
        Commands.reset(nativeRef.current);
      }
    },
  }));

  // Resolve source
  const resolvedSource = useMemo(() => resolveSource(source), [source]);
  const resolvedSpeed = useMemo(() => {
    const { sourceJson } = resolvedSource;
    if (duration && sourceJson && (source as AnimationObject).fr) {
      // reference: https://github.com/lottie-react-native/lottie-react-native/blob/a7a99137b6cd947a4b2881e3a8c2214b114015bc/packages/core/src/LottieView/index.tsx#L119-L124
      return Math.round((((source as AnimationObject).op / (source as AnimationObject).fr) * 1000) / duration);
    }
    return speed;
  }, [duration, resolvedSource, source, speed]);

  // Event handlers
  const handleAnimationFinish = useCallback(
    (event: NativeSyntheticEvent<OnAnimationFinishEvent>) => {
      onAnimationFinish?.(event.nativeEvent.isCancelled);
    },
    [onAnimationFinish]
  );

  const handleAnimationFailure = useCallback(
    (event: NativeSyntheticEvent<OnAnimationFailureEvent>) => {
      onAnimationFailure?.(event.nativeEvent.error);
    },
    [onAnimationFailure]
  );

  const handleAnimationLoaded = useCallback(() => {
    onAnimationLoaded?.();
  }, [onAnimationLoaded]);

  const handleAnimationLoop = useCallback(() => {
    onAnimationLoop?.();
  }, [onAnimationLoop]);

  // Build native props
  const nativeProps: NativeProps = {
    ...restProps,
    style,
    testID,
    ...resolvedSource,
    progress,
    speed: resolvedSpeed,
    loop,
    autoPlay,
    resizeMode,
    renderMode,
    colorFilters,
    cacheComposition,
    imageAssetsFolder,
    onAnimationFinish: onAnimationFinish ? handleAnimationFinish : undefined,
    onAnimationFailure: onAnimationFailure ? handleAnimationFailure : undefined,
    onAnimationLoaded: onAnimationLoaded ? handleAnimationLoaded : undefined,
    onAnimationLoop: onAnimationLoop ? handleAnimationLoop : undefined,
  };

  // Platform-specific props
  if (Platform.OS === 'android') {
    nativeProps.textFiltersAndroid = textFiltersAndroid;
    nativeProps.enableMergePathsAndroidForKitKatAndAbove = enableMergePathsAndroidForKitKatAndAbove;
    nativeProps.enableSafeModeAndroid = enableSafeModeAndroid;
    nativeProps.hardwareAccelerationAndroid = hardwareAccelerationAndroid;
  } else if (Platform.OS === 'ios') {
    nativeProps.textFiltersIOS = textFiltersIOS;
  }

  return <NativeGraniteLottieView ref={nativeRef} {...nativeProps} />;

});

LottieView.displayName = 'LottieView';
