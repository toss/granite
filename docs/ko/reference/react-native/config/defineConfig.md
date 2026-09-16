---
sourcePath: packages/config/src/defineConfig.ts
---

# defineConfig

Granite 애플리케이션의 주요 설정을 정의해요. `granite.config.ts`에서 사용돼요.

다음 값들을 설정할 수 있어요.

- 사용자가 앱에 접근할 URL 스킴 (예: `granite://`)
- URL에 표시될 앱의 고유 이름 (예: `granite://my-service`)
- 빌드와 개발 서버에 사용할 번들러 어댑터

## 기본 설정

```ts
// granite.config.ts
import { defineConfig } from '@granite-js/react-native/config';
import { mpack } from '@granite-js/mpack';

export default defineConfig({
  appName: 'my-app',
  scheme: 'granite',
  host: 'example',
  bundler: mpack(),
});
```

위 설정의 앱에는 `granite://example/my-app`으로 접근할 수 있어요.

## 앱 설정

- `appName`: URL에 표시될 앱의 고유 이름이에요. 필수 값이에요.
- `scheme`: 앱을 실행하기 위한 URL 스킴이에요. 필수 값이에요.
- `host`: URL 스킴의 호스트예요.
  선택 사항이며, 지정하면 `{scheme}://{host}/{appName}` 형태가 돼요.
  개발 서버의 주소와는 다른 설정이에요.
- `cwd`: 설정과 빌드에 사용할 프로젝트 디렉토리예요. 생략하면 패키지 루트를 사용해요.

## 번들러 설정

`bundler`에는 빌드와 개발 서버 실행을 담당할 번들러 어댑터를 지정해요. 필수 값이에요. 번들러 이름 문자열 대신 `mpack()` 또는 `rollipop()`이 반환하는 어댑터를 넣어요.

진입점, 출력 경로, 플러그인 같은 빌드 설정은 어댑터의 옵션이나 설정 파일에서 관리해요.

### Mpack

Mpack은 deprecated 상태로, 하위 호환을 위해 유지해요. `@granite-js/mpack`의 `mpack()`을 사용해요. 개발 서버는 Metro로 실행하고, 배포용 번들은 Mpack으로 빌드해요.

`mpack()` 또는 `mpack({})`은 프로젝트 디렉토리의 `mpack.config.ts` 같은 설정 파일을 읽어요.
다른 파일을 사용하려면 `mpack({ config: './custom.mpack.ts' })`으로 지정할 수 있어요.

```ts
// mpack.config.ts
import { defineConfig } from '@granite-js/mpack/config';
import { hermes } from '@granite-js/plugin-hermes';

export default defineConfig({
  entryFile: './index.ts',
  plugins: [hermes()],
});
```

Granite 플러그인은 이 파일의 `plugins`에, 저수준 Mpack 빌드 플러그인은 `buildPlugins`에 넣어요.
`build`, `metro`, `devServer`로 빌드와 개발 서버 설정을 조정할 수 있어요.

설정 파일에서는 비동기 설정 함수도 지원해요. 함수 인자로 앱 정보와 `command`(`build` 또는 `serve`), `mode`를 받아요.

설정 파일의 `MpackConfig` 옵션을 `mpack()`에 직접 전달할 수도 있어요. 인라인 구성을 사용하면 빌드와 개발 서버 모두 설정 파일을 읽거나 병합하지 않아요.

```ts
// granite.config.ts
import { defineConfig } from '@granite-js/react-native/config';
import { mpack, type MpackInlineOptions } from '@granite-js/mpack';

const bundlerConfig = {
  entryFile: './index.ts',
  build: { esbuild: { minify: false } },
} satisfies MpackInlineOptions;

export default defineConfig({
  appName: 'my-app',
  scheme: 'granite',
  bundler: mpack(bundlerConfig),
});
```

`@granite-js/mpack`에서 `MpackConfigFileOptions`, `MpackInlineOptions` 타입을 제공해요. `MpackOptions`는 두 타입의 유니온이며 파일 지정과 인라인 옵션은 혼합할 수 없어요. 예를 들어 `mpack({ config: './custom.mpack.ts', build: {} })`는 타입 검사와 런타임에서 모두 오류가 발생해요. 파일 없이 인라인 기본값을 사용하려면 `mpack({})` 대신 `mpack({ build: {} })`처럼 옵션을 하나 이상 전달해요.

### Rollipop

`@granite-js/rollipop`에서 `rollipop`을 가져와 `bundler: rollipop()`으로 설정해요. 개발 서버와 배포용 번들 빌드 모두 Rollipop을 사용해요.

구체적인 설정과 플러그인은 `rollipop.config.ts` 같은 Rollipop 설정 파일에 정의해요. 다른 파일은 `rollipop({ configFile: './custom.rollipop.ts' })`으로 지정할 수 있어요.

```ts
// rollipop.config.ts
import { defineConfig } from 'rollipop';

export default defineConfig({
  entry: './index.ts',
  plugins: [],
});
```

## 어댑터 구현

번들러 연동을 직접 구현하려면 `@granite-js/config`의 `BundlerAdapter` 인터페이스를 사용해요. `runBuild()`는 단일 플랫폼 구성을 빌드하고 결과 하나를 반환해요. `runServer()`는 개발 서버를 실행한 뒤 종료를 위한 `close()`가 있는 핸들을 반환해요. 여러 플랫폼을 빌드할 때는 호출부에서 플랫폼별 옵션 배열과 동시 실행 수를 관리해요.

어댑터의 실행 메서드 안에서는 `this.getContext()`로 읽기 전용 `appName`, `scheme`, `host`, `cwd`를 참조할 수 있어요. 이 값을 번들러 설정에 반영할 수 있어요. `this`에 접근하려면 화살표 함수가 아닌 메서드 문법을 사용해요.
