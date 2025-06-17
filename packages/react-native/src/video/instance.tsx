import VideoBase, { VideoNativeProps } from '@granite-js/native/react-native-video';
import { Component as ReactComponent, forwardRef, type ForwardedRef } from 'react';
import { View } from 'react-native';

class FallbackComponent extends ReactComponent<VideoNativeProps & { innerRef: ForwardedRef<View> }> {
  render() {
    return <View ref={this.props.innerRef} />;
  }
}

const ForwardedComponent = forwardRef<View, VideoNativeProps>((props: VideoNativeProps, ref) => (
  <FallbackComponent {...props} innerRef={ref} />
));

function getVideoComponent(): typeof VideoBase {
  try {
    return require('@granite-js/native/react-native-video')?.default;
  } catch {
    return ForwardedComponent as typeof VideoBase;
  }
}

export const Component = getVideoComponent();
export const isAvailable = Component !== ForwardedComponent;
