---
sourcePath: packages/config/src/defineConfig.ts
---

# defineConfig

Granite 애플리케이션의 앱 정보와 번들러를 정의해요.

## 설정

```ts
// granite.config.ts
import { defineConfig } from '@granite-js/react-native/config';
import { rollipop } from '@granite-js/rollipop';

export default defineConfig({
  appName: 'my-app',
  scheme: 'granite',
  host: 'example',
  bundler: rollipop(),
});
```

## 앱 설정

- `appName`: URL에 표시할 앱 이름이에요. 필수 값이에요.
- `scheme`: 앱을 실행할 URL 스킴이에요. 필수 값이에요.
- `host`: URL 스킴의 호스트예요. 지정하면 `{scheme}://{host}/{appName}` 형태가 돼요.
- `cwd`: 설정과 빌드에 사용할 프로젝트 디렉터리예요. 기본값은 패키지 루트예요.

## 번들러

필수 값인 `bundler`에는 `rollipop()`, `mpack()` 또는 직접 구현한 `BundlerAdapter`를 지정해요.

### Rollipop

새 프로젝트에서는 `rollipop()`을 사용하세요. 개발 서버와 배포용 번들을 모두 Rollipop으로 빌드해요.

`rollipop.config.ts` 옵션은 [Rollipop 설정 문서](https://rollipop.dev/docs/get-started/configuration)를 참고하세요. 다른 설정 파일을 사용하려면 `rollipop({ configFile: './custom.rollipop.ts' })`으로 지정해요.

### Mpack (deprecated)

기존 프로젝트는 `mpack()`을 계속 사용할 수 있어요. 개발 서버는 Metro로 실행하고, 배포용 번들은 Mpack으로 빌드해요.

```ts
import { defineConfig } from '@granite-js/react-native/config';
import { mpack } from '@granite-js/mpack';

export default defineConfig({
  appName: 'my-app',
  scheme: 'granite',
  bundler: mpack(),
});
```

`mpack()`은 프로젝트 디렉터리의 `mpack.config.ts`를 읽어요. 다른 파일을 사용하려면 `mpack({ config: './custom.mpack.ts' })`으로 지정해요.

## 커스텀 어댑터

다른 번들러를 연동하려면 `@granite-js/config`의 `BundlerAdapter`를 구현해요. `runBuild()`는 단일 플랫폼 설정을 빌드하고, `runServer()`는 개발 서버를 실행한 뒤 `close()`가 있는 핸들을 반환해요. 어댑터 메서드에서는 `this.getContext()`로 앱 설정을 읽을 수 있어요.

`resetCache()`는 빌드나 서버 실행 전에 기존 캐시를 초기화해요. CLI에서 `granite build --reset-cache` 또는 `granite dev --reset-cache`를 실행하면 한 번 호출해요. 초기화 이후에는 캐시를 다시 사용해요.
