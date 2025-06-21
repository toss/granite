---
sourcePath: packages/react-native/src/video/Video.tsx
---

# Video

The Video component implements audio focus control logic to prevent the app from stopping music playing in other apps. It automatically plays or pauses based on the app's state. For example, when the app transitions to the background, the video automatically pauses.

::: warning
The Video component uses [react-native-video version (6.0.0-alpha.6)](https://github.com/TheWidlarzGroup/react-native-video/tree/v6.0.0-alpha.6). Therefore, some types or features may not be compatible with the latest version.
:::

## Signature

```typescript
Video: import('react').ForwardRefExoticComponent<
  Omit<import('react-native-video').VideoProperties, 'onAudioFocusChanged'> & {
    onAudioFocusChanged?: (event: { hasAudioFocus: boolean }) => void;
  } & import('react').RefAttributes<VideoRef>
>;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">VideoProperties</span>
    <br />
    <p class="post-parameters--description">Properties provided by <a href="https://github.com/TheWidlarzGroup/react-native-video/tree/v6.0.0-alpha.6" target="_blank" rel="noreferrer">`react-native-video`</a>.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.muted</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
        <br />
        <p class="post-parameters--description">Controls the mute state of the video. If <code>true</code>, the video&#39;s audio is muted; if <code>false</code>, the audio plays. Default is <code>false</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.paused</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
        <br />
        <p class="post-parameters--description">Property to control video playback. If <code>true</code>, the video is paused; if <code>false</code>, the video plays. Default is <code>false</code>, and it autoplays.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.onAudioFocusChanged</span><span class="post-parameters--type">OnAudioFocusChanged</span>
        <br />
        <p class="post-parameters--description">Callback function called when audio focus changes. Must be implemented when <code>muted</code> is <code>false</code>. For more details, see <a href="/reference/react-native/Types/OnAudioFocusChanged.html" target="_blank" rel="noreferrer">OnAudioFocusChanged</a>.</p>
      </li>
    </ul>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props.source.uri</span><span class="post-parameters--type">string</span>
    <br />
    <p class="post-parameters--description">Source of the video to play. Can be set to a file path or URL.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">ref</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">Ref&lt;VideoRef&gt;</span>
    <br />
    <p class="post-parameters--description">Reference object to access the video instance. Through this ref, you can access various methods of the video instance.</p>
  </li>
</ul>

### Property

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">isAvailable</span><span class="post-parameters--type">boolean</span>
    <br />
    <p class="post-parameters--description">Value to check if the <code>Video</code> component can be used. You can check this value to determine if the user can render the video or if video functionality is unavailable due to environmental constraints (e.g., network connection issues, unsupported devices). If this value is <code>false</code>, you should handle it by not rendering the video or providing alternative content.</p>
  </li>
</ul>

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">JSX.Element</span>
    <br />
    <p class="post-parameters--description">Returns a JSX element that renders the video. Uses <code>Animated</code> to provide smooth animation effects during video playback.</p>
  </li>
</ul>

## Example

### Video Autoplay Example

```tsx
import { useRef } from 'react';
import { View } from 'react-native';
import { Video } from '@granite-js/react-native';

export function VideoExample() {
  const videoRef = useRef(null);

  return (
    <View>
      <Video
        ref={videoRef}
        source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }}
        muted={true}
        paused={false}
        resizeMode="cover"
        style={{ width: 300, height: 200, borderWidth: 1 }}
      />
    </View>
  );
}
```

## References

- react-native-video https://github.com/react-native-video/react-native-video
  For detailed properties of the video component, please refer to the official documentation.
- react-native-video-6.0.0 https://github.com/TheWidlarzGroup/react-native-video/releases/tag/v6.0.0
  This is the source code of the version currently installed in the sandbox app.
