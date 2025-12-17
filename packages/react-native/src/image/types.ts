import type { Animated } from 'react-native';

// FIXME: DimensionValue type is not available in React Native 0.68, so it's defined separately
export type DimensionValue = string | number | 'auto' | `${number}%` | Animated.AnimatedNode | null;

export type NumberValue = number | string;
