---
sourcePath: packages/react-native/src/video/instance.tsx
---

# OnAudioFocusChanged

오디오 포커스가 변경될 때 호출되는 콜백 함수예요. `muted`가 `false`인 경우에는 반드시 구현해야 해요.

## 시그니처

```typescript
type OnAudioFocusChanged = (event: { hasAudioFocus: boolean }) => void;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">event</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">Object</span>
    <br />
    <p class="post-parameters--description">오디오 포커스 정보를 담고 있는 이벤트 객체예요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">event.hasAudioFocus</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">boolean</span>
        <br />
        <p class="post-parameters--description">비디오 컴포넌트가 오디오 포커스를 가지고 있는지 여부를 나타내요.</p>
      </li>
    </ul>
  </li>
</ul>
