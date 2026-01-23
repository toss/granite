import { forwardRef, useImperativeHandle } from 'react';
import { Text, View } from 'react-native';
import type { VideoProps, VideoRef } from './types';

const noop = () => {};

const VideoBase = forwardRef<VideoRef, VideoProps>(({ source, style, testID }, ref) => {
  useImperativeHandle(ref, () => ({
    seek: noop,
    pause: noop,
    resume: noop,
    setVolume: noop,
    setFullScreen: noop,
    presentFullscreenPlayer: noop,
    dismissFullscreenPlayer: noop,
    enterPictureInPicture: noop,
    exitPictureInPicture: noop,
    setSource: noop,
    getCurrentPosition: async () => 0,
    save: async () => ({ uri: '' }),
    restoreUserInterfaceForPictureInPictureStopCompleted: noop,
  }));

  const uri = typeof source === 'object' && source && 'uri' in source ? source.uri : undefined;

  return (
    <View testID={testID} style={[{ alignItems: 'center', justifyContent: 'center', padding: 12 }, style]}>
      <Text>Video is not supported on web.</Text>
      {uri ? <Text>{uri}</Text> : null}
    </View>
  );
});

VideoBase.displayName = 'Video';

const VideoComponent = VideoBase as typeof VideoBase & { isAvailable: boolean };
VideoComponent.isAvailable = false;

export const Video = VideoComponent;
export default Video;
