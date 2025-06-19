---
sourcePath: packages/image/src/Image.tsx
---

# Image

You can use the `Image` component to load and render bitmap images (such as PNG, JPG) or vector images (SVG). It automatically renders with the appropriate method depending on the image format.

## Signature

```typescript
declare function Image(props: ImageProps): import('react/jsx-runtime').JSX.Element;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">The <code>props</code> object passed to the component.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.style</span><span class="post-parameters--type">object</span>
        <br />
        <p class="post-parameters--description">An object that defines the style for the image component. It can include layout-related properties like <code>width</code> and <code>height</code>.</p>
      </li>
      <ul class="post-parameters-ul">
        <li class="post-parameters-li">
          <span class="post-parameters--name">props.source</span><span class="post-parameters--type">object</span>
          <br />
          <p class="post-parameters--description">An object containing information about the image resource to load.</p>
          <ul class="post-parameters-ul">
            <li class="post-parameters-li">
              <span class="post-parameters--name">props.source.uri</span><span class="post-parameters--type">string</span>
              <br />
              <p class="post-parameters--description">The URI address representing the image resource to load.</p>
            </li>
            <li class="post-parameters-li">
              <span class="post-parameters--name">props.source.cache</span><span class="post-parameters--type">&#39;immutable&#39; | &#39;web&#39; | &#39;cacheOnly&#39;</span> · <span class="post-parameters--default">&#39;immutable&#39;</span>
              <br />
              <p class="post-parameters--description">An option to set the image caching strategy. This applies only to bitmap images. The default value is <code>immutable</code>.</p>
            </li>
          </ul>
        </li>
      </ul>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.onLoadStart</span><span class="post-parameters--type">() =&gt; void</span>
        <br />
        <p class="post-parameters--description">A callback function that is called when image loading starts.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.onLoadEnd</span><span class="post-parameters--type">() =&gt; void</span>
        <br />
        <p class="post-parameters--description">A callback function that is called when image loading finishes.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.onError</span><span class="post-parameters--type">() =&gt; void</span>
        <br />
        <p class="post-parameters--description">A callback function that is called when an error occurs during image loading.</p>
      </li>
    </ul>
  </li>
</ul>

## Example

### Example: Loading and rendering an image

The following example shows how to load bitmap and vector image resources, and how to print an error message to `console.log` if an error occurs.

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
