---
sourcePath: packages/cli/src/config/defineConfig.ts
---

# defineConfig

Granite 애플리케이션의 주요 설정을 정의해요. `granite.config.ts`에서 사용돼요.

다음 값들을 설정할 수 있어요.

- 사용자가 앱에 접근할 URL 스킴 (예: `granite://`)
- URL에 표시될 앱의 고유 이름 (예: `granite://my-service`)
- ESBuild와 Metro 같은 번들러 설정
- Babel을 통한 코드 변환 설정
- Granite 플러그인을 통한 추가 기능

## 시그니처

```typescript
function defineConfig({
  appName,
  scheme,
  plugins,
  outdir,
  entryFile,
  cwd,
  mpack,
  babel,
  esbuild,
  metro,
}: GraniteConfigInput): Promise<GraniteConfigResponse>
```

## 매개변수

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">config</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">GraniteConfigInput</span>
    <br />
    <p class="post-parameters--description">URL 스킴, 앱 이름, 빌드 설정, 플러그인과 같은 주요 설정을 정의하는 Granite 애플리케이션 설정 옵션이에요.</p>
  </li>
</ul>

설정 옵션에는 다음과 같은 것들이 있어요:

- `appName`: URL에 표시될 앱의 고유 식별자예요 (예: `my-service`)
- `scheme`: 앱을 실행하기 위한 URL 스킴이에요 (예: `granite`)
- `plugins`: 기능을 확장하기 위한 Granite 플러그인이에요
- `outdir`: 빌드 파일이 출력될 위치예요 (기본값: `dist`)
- `entryFile`: 앱의 진입점이에요 (기본값: `./src/_app.tsx`)
- `cwd`: 빌드 프로세스의 작업 디렉토리예요 (기본값: `process.cwd()`)
- `mpack`: mpack 번들러 동작을 세밀하게 조정할 수 있어요
- `babel`: Babel 트랜스파일 설정을 커스터마이즈할 수 있어요
- `esbuild`: ESBuild 번들링을 조정할 수 있어요
- `metro`: Metro 번들러 설정을 구성할 수 있어요

## 예시

### 기본 설정

다음은 기본적인 Granite 서비스 설정 예시예요.

- `granite://` 스킴을 통해 앱에 접근할 수 있어요
- 서비스 이름을 "my-app"으로 설정해서 `granite://my-app`으로 접근할 수 있어요
- Hermes 플러그인을 사용해서 JavaScript 번들을 바이트코드로 최적화해요

```typescript
import { defineConfig } from '@granite-js/react-native/config';
import { hermes } from '@granite-js/plugin-hermes';

export default defineConfig({
  // 마이크로서비스의 이름
  appName: 'my-app',
  // 딥링크를 위한 URL 스킴
  scheme: 'granite',
  // 진입점 파일 경로
  entryFile: 'index.ts',
  // 사용할 플러그인 배열
  plugins: [hermes()],
});
```
