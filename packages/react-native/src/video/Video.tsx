import type { default as VideoRef } from '@granite-js/native/react-native-video';
import { ComponentProps, forwardRef, useMemo, useState } from 'react';
import { Animated, Platform } from 'react-native';
import * as instance from './instance';
import { useVisibility } from '../visibility';

const AnimatedRNVideo = Animated.createAnimatedComponent(instance.Component);

type VideoProps = ComponentProps<typeof AnimatedRNVideo>;

/**
 * @public
 * @name Video
 * @category UI
 * @description
 * The Video component implements audio focus control logic to prevent the sandbox app from stopping music playing in other apps. It automatically plays or pauses based on the app's state. For example, when the app transitions to the background, the video automatically pauses.
 *
 * ::: warning
 * The Video component uses [react-native-video version (6.0.0-alpha.6)](https://github.com/TheWidlarzGroup/react-native-video/tree/v6.0.0-alpha.6). Therefore, some types or features may not be compatible with the latest version.
 * :::
 *
 * @property {boolean} [isAvailable] Value to check if the `Video` component can be used. You can check this value to determine if the user can render the video or if video functionality is unavailable due to environmental constraints (e.g., network connection issues, unsupported devices). If this value is `false`, you should handle it by not rendering the video or providing alternative content.
 *
 * @param {VideoProperties} [props] Properties provided by [`react-native-video`](https://github.com/TheWidlarzGroup/react-native-video/tree/v6.0.0-alpha.6).
 * @param {string} [props.source.uri] Source of the video to play. Can be set to a file path or URL.
 * @param {boolean} [props.muted=false] Controls the mute state of the video. If `true`, the video's audio is muted; if `false`, the audio plays. Default is `false`.
 * @param {boolean} [props.paused=false] Property to control video playback. If `true`, the video is paused; if `false`, the video plays. Default is `false`, and it autoplays.
 * @param {OnAudioFocusChanged} [props.onAudioFocusChanged] Callback function called when audio focus changes. Must be implemented when `muted` is `false`. For more details, see [OnAudioFocusChanged](/reference/react-native/Types/OnAudioFocusChanged.html).
 * @param {Ref<VideoRef>} ref Reference object to access the video instance. Through this ref, you can access various methods of the video instance.
 *
 * @returns {JSX.Element} Returns a JSX element that renders the video. Uses `Animated` to provide smooth animation effects during video playback.
 *
 * @see [react-native-video] https://github.com/react-native-video/react-native-video
 * For detailed properties of the video component, please refer to the official documentation.
 * @see [react-native-video-6.0.0] https://github.com/TheWidlarzGroup/react-native-video/releases/tag/v6.0.0
 * This is the source code of the version currently installed in the sandbox app.
 *
 * @example
 *
 * ### Video Autoplay Example
 *
 * ```tsx
 * import { useRef } from 'react';
 * import { View } from 'react-native';
 * import { Video } from '@granite-js/react-native';
 *
 * export function VideoExample() {
 *   const videoRef = useRef(null);
 *
 *   return (
 *     <View>
 *       <Video
 *         ref={videoRef}
 *         source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }}
 *         muted={true}
 *         paused={false}
 *         resizeMode="cover"
 *         style={{ width: 300, height: 200, borderWidth: 1 }}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
const VideoImpl = forwardRef<VideoRef, instance.VideoNativeProps>((props, ref) => {
  const [isFocused, setIsFocused] = useState(props.muted || props.paused);
  const visible = useVisibility();

  // If focus state is not managed directly by the service through onAudioFocusChanged, control the paused value based on internal state.
  const paused = useMemo(
    () => !visible || props.paused || (!props.onAudioFocusChanged && !isFocused),
    [props.onAudioFocusChanged, props.paused, visible, isFocused]
  );

  const disableFocus = props.muted || props.paused;
  const mixWithOthers = props.muted ? 'mix' : undefined;

  return (
    <AnimatedRNVideo
      ref={ref as any}
      progressUpdateInterval={16}
      disableFocus={Platform.OS === 'ios' ? false : disableFocus}
      playWhenInactive
      onAudioFocusChanged={(event: any) => {
        setIsFocused(event.hasAudioFocus);
        props.onAudioFocusChanged?.(event);
      }}
      {...props}
      // Internal state is used to control the component's states.
      paused={paused}
      mixWithOthers={mixWithOthers}
    />
  );
});

export const Video = Object.defineProperty(VideoImpl, 'isAvailable', {
  get: () => instance.isAvailable,
  configurable: false,
}) as typeof VideoImpl & { isAvailable: boolean };

export type { VideoRef, VideoProps };
