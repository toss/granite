import VideoRef, { type ReactVideoProps } from '@granite-js/native/react-native-video';
import {
  Component as ReactComponent,
  forwardRef,
  type ForwardRefExoticComponent,
  type ForwardedRef,
  type RefAttributes,
} from 'react';
import { View } from 'react-native';

export type VideoNativeProps = Omit<ReactVideoProps, 'onAudioFocusChanged'> & {
  onAudioFocusChanged?: (event: { hasAudioFocus: boolean }) => void;
};

type VideoComponentType = ForwardRefExoticComponent<VideoNativeProps & RefAttributes<typeof VideoRef | View>>;

class FallbackComponent extends ReactComponent<VideoNativeProps & { innerRef: ForwardedRef<View> }> {
  render() {
    return <View ref={this.props.innerRef} />;
  }
}

const ForwardedFallback = forwardRef<View, VideoNativeProps>((props, ref) => (
  <FallbackComponent {...props} innerRef={ref} />
));

function getVideoComponent(): VideoComponentType {
  try {
    const NativeVideo = require('@granite-js/native/react-native-video')?.default;
    if (NativeVideo) {
      return NativeVideo as VideoComponentType;
    }
    return ForwardedFallback as VideoComponentType;
  } catch {
    return ForwardedFallback as VideoComponentType;
  }
}

const NativeVideoComponent = getVideoComponent();
const isVideoAvailable = NativeVideoComponent !== (ForwardedFallback as VideoComponentType);

/**
 * @public
 * @name Video
 * @category UI
 * @description
 * Core Video component that wraps react-native-video.
 *
 * ::: warning
 * The Video component uses [react-native-video version (6.0.0-alpha.6)](https://github.com/TheWidlarzGroup/react-native-video/tree/v6.0.0-alpha.6). Therefore, some types or features may not be compatible with the latest version.
 * :::
 *
 * @property {boolean} [isAvailable] Value to check if the `Video` component can be used.
 *
 * @param {VideoProperties} [props] Properties provided by [`react-native-video`](https://github.com/TheWidlarzGroup/react-native-video/tree/v6.0.0-alpha.6).
 * @param {Ref<VideoRef>} ref Reference object to access the video instance.
 *
 * @returns {JSX.Element} Returns a JSX element that renders the video.
 */
const VideoImpl = forwardRef<typeof VideoRef | View, VideoNativeProps>((props, ref) => {
  return <NativeVideoComponent ref={ref} {...props} />;
});

export const Video = Object.defineProperty(VideoImpl, 'isAvailable', {
  get: () => isVideoAvailable,
  configurable: false,
}) as typeof VideoImpl & { isAvailable: boolean };

export { VideoRef };
export type { VideoNativeProps as VideoProps };
