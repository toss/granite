# @granite-js/image

## Android Coil provider

Enable the built-in Coil provider in the application's `gradle.properties`:

```properties
GRANITE_IMAGE_DEFAULT_PROVIDER=true
GRANITE_PROVIDER=coil
```

The provider uses Coil 2.5 and one application-scoped image loader for image views,
preloading, and cache management. Applications that configured Coil's global singleton
should explicitly inject that loader as shown below. The default loader supports static images, animated
GIF/WebP (according to Android's decoder support), and SVG. View requests are sized to
the target; viewless preloads use Coil's display-size resolution rather than forcing
full-resolution bitmap decoding. HTTP headers, placeholders named after Android
`drawable` resources, tinting, local file/content/resource URIs, and cancellation are
supported.

- `cachePolicy="none"` disables Coil memory and disk caching.
- `cachePolicy="memory"` enables only Coil memory caching.
- `cachePolicy="disk"` enables both. HTTP cache headers still apply.
- `priority` orders queued requests (`high`, `normal`, `low`), with FIFO ordering within
  a priority. The default limit is six active requests; running requests are not preempted.
- `onProgress` reports HTTP response-body bytes, throttled to approximately 64 KiB
  increments plus completion. An unknown total is `-1` until the response ends.
  Cache hits do not emit download progress.
- `preload()` rejects if any image fails. `clearDiskCache()` resolves after the
  background cache clear finishes.

### Reusing an application's image loader

Register a provider during application startup, before React Native creates image views:

```kotlin
GraniteImageRegistry.registerProvider(
    CoilImageProvider(applicationContext, imageLoader = sharedImageLoader)
)
```

The provider derives a loader that shares the supplied loader's memory cache, disk
cache, HTTP client, defaults, and decoder configuration, and adds request scheduling.
It does not shut down the application's loader. Custom providers are preserved by
package initialization. An explicitly supplied loader is responsible for its own GIF/SVG
decoders.

To receive byte progress with a custom loader, install `CoilImageProgressInterceptor`
as an **application interceptor** on that loader's OkHttp client when building it:

```kotlin
val client = existingHttpClient.newBuilder()
    .addInterceptor(CoilImageProgressInterceptor())
    .build()
val sharedImageLoader = ImageLoader.Builder(applicationContext)
    .okHttpClient(client)
    // Add the application's decoder and cache configuration here.
    .build()
```

The interceptor only observes requests tagged by this provider. Without it, the custom
loader continues to load images, but cannot report download bytes. Direct native callers
receive progress on the response reader's thread; the React Native component dispatches
its progress events on the UI thread. Completion callbacks run on Coil's main dispatcher.

The no-argument constructor remains available for automatic registration. For direct
native use, supply a context or call `initialize(applicationContext)` before preloading.

### Android regression tests

With JDK 17, Android SDK 35, and the workspace's Yarn dependencies installed:

```sh
packages/image/android/test-providers.sh
```

The standalone Android test project compiles all built-in providers and the RN image
integration, generates the real component bindings, and runs Robolectric/MockWebServer
tests for caching, preload, callbacks, cancellation, priority, progress, and prop updates.
It does not need an emulator or a built example application.

## License

This software is licensed under the [Apache 2 license](LICENSE), quoted below.

```
Copyright 2025 Viva Republica, Inc

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

```
