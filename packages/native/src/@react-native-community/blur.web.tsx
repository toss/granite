import React from 'react';
import { View, type ViewProps } from 'react-native';

export type BlurViewProps = ViewProps & {
  blurType?: string;
  blurAmount?: number;
  blurRadius?: number;
  reducedTransparencyFallbackColor?: string;
};

export const BlurView = ({ children, ...props }: BlurViewProps) => {
  return <View {...props}>{children}</View>;
};

export type VibrancyViewProps = ViewProps & {
  blurType?: string;
  blurAmount?: number;
};

export const VibrancyView = ({ children, ...props }: VibrancyViewProps) => {
  return <View {...props}>{children}</View>;
};

export default BlurView;
