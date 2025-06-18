import type { VideoProperties } from '@granite-js/native/react-native-video';
import { Component as ReactComponent, forwardRef, type ComponentType, type ForwardedRef } from 'react';
import { View } from 'react-native';

export type VideoNativeProps = Omit<VideoProperties, 'onAudioFocusChanged'> & {
  onAudioFocusChanged?: (event: { hasAudioFocus: boolean }) => void;
};

class FallbackComponent extends ReactComponent<VideoNativeProps & { innerRef: ForwardedRef<View> }> {
  render() {
    return <View ref={this.props.innerRef} />;
  }
}

const ForwardedComponent = forwardRef<View, VideoNativeProps>((props: VideoNativeProps, ref) => (
  <FallbackComponent {...props} innerRef={ref} />
));

function getVideoComponent(): ComponentType<VideoNativeProps> {
  try {
    return require('@granite-js/native/react-native-video')?.default;
  } catch {
    return ForwardedComponent;
  }
}

export const Component = getVideoComponent();
export const isAvailable = Component !== ForwardedComponent;
