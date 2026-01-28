import LottieView, { type AnimationObject, type OnAnimationFailureEvent } from '@granite-js/lottie';
import type { ComponentProps } from 'react';
import { View, type NativeSyntheticEvent } from 'react-native';
import { ensureSafeLottie, hasFonts } from './ensureSafeLottie';
import { useFetchResource } from './useFetchResource';

type LottieViewProps = ComponentProps<typeof LottieView>;
type BaseProps = Omit<LottieViewProps, 'source'> & {
  /**
   * Height is required to prevent layout shifting.
   */
  height: number | '100%';
  width?: number | '100%';
  maxWidth?: number;
};

export type RemoteLottieProps = BaseProps & {
  src: string;
};

export type AnimationObjectLottieProps = BaseProps & {
  animationObject: AnimationObject;
};

export function Lottie({
  width,
  maxWidth,
  height,
  src,
  autoPlay = true,
  speed = 1,
  style,
  onAnimationFailure,
  ...props
}: RemoteLottieProps) {
  const handleAnimationFailure = onAnimationFailure
    ? (event: { error: string }) => {
        onAnimationFailure({ nativeEvent: event } as NativeSyntheticEvent<OnAnimationFailureEvent>);
      }
    : undefined;

  const jsonData = useFetchResource(src, handleAnimationFailure);

  if (jsonData == null) {
    return <View testID="lottie-placeholder" style={[{ opacity: 1, width, height }, style]} />;
  }

  if (hasFonts(jsonData) && __DEV__) {
    throw new Error(
      `The Lottie resource contains custom fonts which is unsafe. Please remove the custom fonts. source: ${src}`
    );
  }

  return (
    <LottieView
      source={ensureSafeLottie(jsonData)}
      autoPlay={autoPlay}
      speed={speed}
      style={[{ width, height, maxWidth }, style]}
      onAnimationFailure={onAnimationFailure}
      {...props}
    />
  );
}

Lottie.AnimationObject = function LottieWithAnimationObject({
  width,
  maxWidth,
  height,
  animationObject,
  autoPlay = true,
  speed = 1,
  style,
  onAnimationFailure,
  ...props
}: AnimationObjectLottieProps) {
  return (
    <LottieView
      source={animationObject}
      autoPlay={autoPlay}
      speed={speed}
      style={[{ width, height, maxWidth }, style]}
      onAnimationFailure={onAnimationFailure}
      {...props}
    />
  );
};
