---
sourcePath: packages/react-native/src/video/instance.tsx
---

# OnAudioFocusChanged

This is a callback function triggered when the audio focus changes. It must be implemented when `muted` is set to `false`.

## Signature

```typescript
type OnAudioFocusChanged = (event: { hasAudioFocus: boolean }) => void;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">event</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">Object</span>
    <br />
    <p class="post-parameters--description">An event object that contains audio focus information.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">event.hasAudioFocus</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">boolean</span>
        <br />
        <p class="post-parameters--description">Indicates whether the video component currently has audio focus.</p>
      </li>
    </ul>
  </li>
</ul>
