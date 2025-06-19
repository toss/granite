---
sourcePath: packages/image/src/Image.tsx
---

# Image

`Image` 컴포넌트를 사용해서 비트맵 이미지(png, jpg 등)나 벡터 이미지(svg)를 로드하고 화면에 렌더링할 수 있어요. 이미지 형식에 맞게 자동으로 적절한 방식으로 렌더링돼요.

## 시그니처

```typescript
declare function Image(props: ImageProps): import('react/jsx-runtime').JSX.Element;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">컴포넌트에 전달되는 <code>props</code> 객체예요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.style</span><span class="post-parameters--type">object</span>
        <br />
        <p class="post-parameters--description">이미지 컴포넌트의 스타일을 설정하는 객체예요. <code>width</code>, <code>height</code> 등 레이아웃 관련 속성을 포함할 수 있어요.</p>
      </li>
      <ul class="post-parameters-ul">
        <li class="post-parameters-li">
          <span class="post-parameters--name">props.source</span><span class="post-parameters--type">object</span>
          <br />
          <p class="post-parameters--description">로드할 이미지 리소스에 대한 정보를 담고 있는 객체예요.</p>
          <ul class="post-parameters-ul">
            <li class="post-parameters-li">
              <span class="post-parameters--name">props.source.uri</span><span class="post-parameters--type">string</span>
              <br />
              <p class="post-parameters--description">로드할 이미지 리소스를 나타내는 URI 주소예요.</p>
            </li>
            <li class="post-parameters-li">
              <span class="post-parameters--name">props.source.cache</span><span class="post-parameters--type">&#39;immutable&#39; | &#39;web&#39; | &#39;cacheOnly&#39;</span> · <span class="post-parameters--default">&#39;immutable&#39;</span>
              <br />
              <p class="post-parameters--description">이미지 캐시 전략을 설정할 수 있는 옵션이에요. 이 옵션은 비트맵 이미지에만 적용돼요. 기본값은 <code>immutable</code>이예요.</p>
            </li>
          </ul>
        </li>
      </ul>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.onLoadStart</span><span class="post-parameters--type">() =&gt; void</span>
        <br />
        <p class="post-parameters--description">이미지 로딩이 시작될 때 호출되는 콜백 함수예요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.onLoadEnd</span><span class="post-parameters--type">() =&gt; void</span>
        <br />
        <p class="post-parameters--description">이미지 로딩이 완료되었을 때 호출되는 콜백 함수예요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.onError</span><span class="post-parameters--type">() =&gt; void</span>
        <br />
        <p class="post-parameters--description">이미지 로드 중 에러가 발생했을 때 호출되는 콜백 함수예요.</p>
      </li>
    </ul>
  </li>
</ul>

## 예제

### 이미지 로드 및 렌더링 예시

다음 예시는 비트맵 및 벡터 이미지 리소스를 로드하고, 에러가 발생했을 때 `console.log`로 에러 메시지를 출력하는 방법을 보여줘요.

```tsx
import { Image } from '@granite-js/react-native';
import { View } from 'react-native';

export function ImageExample() {
  return (
    <View>
      <Image
        source={{ uri: 'my-image-link' }}
        style={{
          width: 300,
          height: 300,
          borderWidth: 1,
        }}
        onError={() => {
          console.log('Failed to load image');
        }}
      />

      <Image
        source={{ uri: 'my-svg-link' }}
        style={{
          width: 300,
          height: 300,
          borderWidth: 1,
        }}
        onError={() => {
          console.log('Failed to load image');
        }}
      />
    </View>
  );
}
```
