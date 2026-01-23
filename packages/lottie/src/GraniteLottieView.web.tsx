import { forwardRef, useImperativeHandle } from 'react';
import { Text, View } from 'react-native';
import type { LottieViewProps, LottieViewRef } from './types';

export const LottieView = forwardRef<LottieViewRef, LottieViewProps>(({ style, testID }, ref) => {
  useImperativeHandle(ref, () => ({
    play: () => {},
    pause: () => {},
    resume: () => {},
    reset: () => {},
  }));

  return (
    <View testID={testID} style={[{ alignItems: 'center', justifyContent: 'center', padding: 12 }, style]}>
      <Text>Lottie is not supported on web.</Text>
    </View>
  );
});

LottieView.displayName = 'LottieView';
