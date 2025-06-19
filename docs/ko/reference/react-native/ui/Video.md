---
sourcePath: packages/react-native/src/video/Video.tsx
---

# Video

Video 컴포넌트는 다른 앱에서 음악을 재생 중일 때, 앱에서 그 음악을 중지시키지 않도록 오디오 포커스를 제어하는 로직이 구현된 컴포넌트에요. 앱의 상태에 따라 자동으로 재생하거나 일시정지해요. 예를 들어, 앱이 백그라운드로 전환되면 비디오가 자동으로 일시정지돼요.

::: warning
Video 컴포넌트는 [`react-native-video` 버전(6.0.0-alpha.6)](https://github.com/TheWidlarzGroup/react-native-video/tree/v6.0.0-alpha.6) 을 사용하고 있어요. 따라서 일부 타입이나 기능이 최신 버전과 호환되지 않을 수 있어요.
:::

## 시그니처

```typescript
Video: import('react').ForwardRefExoticComponent<
  Omit<import('react-native-video').VideoProperties, 'onAudioFocusChanged'> & {
    onAudioFocusChanged?: (event: { hasAudioFocus: boolean }) => void;
  } & import('react').RefAttributes<VideoRef>
>;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">VideoProperties</span>
    <br />
    <p class="post-parameters--description"><a href="https://github.com/TheWidlarzGroup/react-native-video/tree/v6.0.0-alpha.6" target="_blank" rel="noreferrer">`react-native-video`</a>에서 제공하는 속성들이에요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.muted</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
        <br />
        <p class="post-parameters--description">비디오의 음소거 상태를 제어해요. <code>true</code>면 비디오의 오디오가 음소거되고, <code>false</code>면 오디오가 재생돼요. 기본값은 <code>false</code>에요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.paused</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
        <br />
        <p class="post-parameters--description">비디오 재생을 제어하는 속성이에요. <code>true</code>이면 비디오가 일시 정지되고, <code>false</code>이면 비디오가 재생돼요. 기본값은 <code>false</code>이고, 자동 재생돼요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.onAudioFocusChanged</span><span class="post-parameters--type">callback</span>
        <br />
        <p class="post-parameters--description">오디오 포커스가 변경될 때 호출되는 콜백 함수에요. <code>muted</code> 가 <code>false</code> 인 경우에 필수로 구현해야해요.</p>
      </li>
    </ul>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props.source.uri</span><span class="post-parameters--type">string</span>
    <br />
    <p class="post-parameters--description">재생할 비디오의 소스에요. 파일 경로나 URL을 설정할 수 있어요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">event</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">Object</span>
    <br />
    <p class="post-parameters--description">- 오디오 포커스 정보를 담고 있는 이벤트 객체에요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">event.hasAudioFocus</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">boolean</span>
        <br />
        <p class="post-parameters--description">- 비디오 컴포넌트가 오디오 포커스를 가지고 있는지 여부를 나타내요.</p>
      </li>
    </ul>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">ref</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">Ref&lt;VideoRef&gt;</span>
    <br />
    <p class="post-parameters--description">비디오 인스턴스에 접근하기 위한 ref 객체에요. 이 ref를 통해 비디오 인스턴스의 여러 메서드에 접근할 수 있어요.</p>
  </li>
</ul>

### 프로퍼티

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">isAvailable</span><span class="post-parameters--type">boolean</span>
    <br />
    <p class="post-parameters--description"><code>Video</code> 컴포넌트를 사용할 수 있는지 확인하는 값이에요. 이 값을 확인해서 사용자가 비디오를 렌더링할 수 있는지 혹은 환경적 제약(예: 네트워크 연결 문제, 지원되지 않는 디바이스 등)으로 인해 비디오 기능을 사용할 수 없는지를 먼저 확인할 수 있어요. 이 값이 <code>false</code>라면, 비디오를 렌더링하지 않거나 대체 콘텐츠를 제공하는 등의 처리를 해야 해요.</p>
  </li>
</ul>

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">JSX.Element</span>
    <br />
    <p class="post-parameters--description">비디오를 렌더링하는 JSX 엘리먼트를 반환해요. <code>Animated</code>를 사용해 부드러운 애니메이션 효과를 포함한 비디오 재생을 제공해요.</p>
  </li>
</ul>

## 예제

### 동영상 자동 재생 예제

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

## 참고

- react-native-video https://github.com/react-native-video/react-native-video
  비디오 컴포넌트 프로퍼티에 대한 자세한 내용은 공식 문서를 참고하세요.
- react-native-video-6.0.0 https://github.com/TheWidlarzGroup/react-native-video/releases/tag/v6.0.0
  샌드박스 앱에 설치된 버전의 소스코드
