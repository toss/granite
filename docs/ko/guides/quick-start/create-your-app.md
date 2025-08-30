# Granite 시작하기

10분 안에 첫 엔터프라이즈급 React Native 마이크로서비스 앱을 만들어보세요.

## 준비물

시작하기 전에 다음 도구들이 설치되어 있는지 확인하세요.

- **Node.js LTS** (22.12.0 권장) - [다운로드](https://nodejs.org/)
- **Xcode** (iOS 테스트용) - Mac App Store에서 설치 가능
- **Android Studio** (Android 테스트용) - [다운로드](https://developer.android.com/studio)
- **Granite 테스트 앱** - iOS 시뮬레이터나 Android 에뮬레이터에 설치 ([설치 가이드](../miscellaneous/install-native-app))

## 1. Granite 프로젝트 생성

터미널을 열고 Granite 프로젝트를 만드는 명령어를 실행하세요.

::: code-group

```sh [npm]
npx create-granite-app@latest
```

```sh [pnpm]
pnpm create granite-app
```

```sh [yarn]
yarn create granite-app
```

:::

CLI의 질문에 답하면 Granite 프로젝트가 생성돼요.

```sh
$ npx create-granite-app@latest

┌  Create Granite App Project
│
◆  Project Setup
◇  Project name or path:
│  my-granite-app
│
◇  Select development tools:
│  ◻ ESLint + Prettier (recommended)
│  ◻ Biome
│
◇  ✅ Created Granite App successfully!
│
◇  Next steps ─────────────╮
│                          │
│  cd my-granite-app       │
│  npm install             │
│  npm run dev             │
│                          │
├──────────────────────────╯
│
└  🎉 Done! Your Granite app is ready.
```

이렇게 하면 프로젝트 이름으로 새 디렉토리가 생성되고 기본적인 Granite 앱 구조가 생겨요.

## 2. 의존성 설치

새로 생긴 프로젝트 디렉토리로 이동해서 의존성을 설치하세요.

```sh
cd my-granite-app
```

::: code-group

```sh [npm]
npm install
```

```sh [pnpm]
pnpm install
```

```sh [yarn]
yarn install
```

:::

## 3. 프로젝트 구조 이해하기

Granite 프로젝트는 다음과 같은 구조를 가지고 있어요.

```
my-granite-app/
├── pages/                  # 마이크로서비스 화면들
│   ├── _404.tsx            # 404 에러 페이지
│   └── index.tsx           # 홈 화면
│
├── src/                    # 소스 코드
│   ├── _app.tsx            # 마이크로서비스 진입점
│   └── router.gen.ts       # 타입 안전한 라우팅을 위해 자동 생성된 코드
│
├── granite.config.ts       # Granite 설정
├── react-native.config.js  # React Native 설정
└── require.context.ts      # 자동 생성된 라우팅 컨텍스트
```

Granite 프로젝트의 중요한 디렉토리와 파일은 다음과 같아요.

- **'pages/'** - 각 파일이 앱의 화면이 돼요
- **'granite.config.ts'** - Granite 앱 설정 ([참고](../../reference/react-native/config/defineConfig))
- **'src/\_app.tsx'** - 마이크로서비스의 모든 화면에서 공유하는 로직을 추가할 수 있는 메인 진입점

## 4. 개발 서버 실행

다음 명령어로 Granite 개발 서버를 실행해 보세요.

::: code-group

```sh [npm]
npm run dev
```

```sh [pnpm]
pnpm run dev
```

```sh [yarn]
yarn dev
```

:::

개발 서버가 정상적으로 실행되면, 다음과 같이 Granite 글자가 떠요.

```
 ██████╗ ██████╗  █████╗ ███╗   ██╗██╗████████╗███████╗
██╔════╝ ██╔══██╗██╔══██╗████╗  ██║██║╚══██╔══╝██╔════╝
██║  ███╗██████╔╝███████║██╔██╗ ██║██║   ██║   █████╗
██║   ██║██╔══██╗██╔══██║██║╚██╗██║██║   ██║   ██╔══╝
╚██████╔╝██║  ██║██║  ██║██║ ╚████║██║   ██║   ███████╗
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚══════╝

                  Welcome to Granite

To reload the app press "r"
To open developer menu press "d"
To open debugger press "j"
```

> **✅ 성공했다면:** Granite을 표시한 ASCII 문자와 개발 시 사용할 수 있는 명령어가 보여요.

## 5. 개발 서버에서 테스트

이제 Granite 테스트 앱에서 생성된 앱을 실행해보세요.

### 5.1 Granite 테스트 앱 설치

아직 설치하지 않았다면, 시뮬레이터에 Granite 테스트 앱을 설치해 보세요. [설치 가이드](../miscellaneous/install-native-app)를 따라가면 쉽게 설치할 수 있어요.

### 5.2 앱 실행

1. **iOS 시뮬레이터** 또는 **Android 에뮬레이터**를 실행하세요
2. 시뮬레이터에서 **Granite 테스트 앱**을 실행하세요
3. **개발 서버에 연결하기:**
   - 터미널에서 `granite dev`가 계속 실행 중인지 확인하세요
   - **Android 사용자의 경우:** 별도 터미널에서 `adb reverse tcp:8081 tcp:8081` 명령어를 실행하여 연결을 활성화하세요
   - Granite 테스트 앱에서 **"Open Dev Server"**를 탭하세요
   - 앱이 로컬 개발 서버에 연결되어 React Native 화면을 로드해요

네이티브 앱에서 Granite 앱이 로딩되는 걸 볼 수 있어요.

> **✅ 성공했다면:** 네이티브 Granite 테스트 앱에서 React Native 화면이 보여요

## 6. 첫 화면 만들기

Granite에서 라우팅이 어떻게 작동하는지 이해하기 위해 새 화면을 생성해 볼게요.

### 6.1 프로필 화면 만들기

다음과 같이 `pages/profile.tsx` 파일을 새로 만드세요.

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>프로필 화면</Text>
      <Text style={styles.description}>여기는 프로필 서비스</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});
```

### 6.2 화면 간 이동

`pages/index.tsx`를 수정해서 내비게이션을 추가하세요.

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from '@granite/router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Granite</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/profile')}>
        <Text style={styles.buttonText}>프로필로 가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

파일을 저장하면 앱이 자동으로 새로고침돼요.

> **✅ 성공했다면:** 홈 화면과 프로필 화면 사이를 이동할 수 있어요

## 7. 앱 빌드하기

배포를 위한 프로덕션 번들을 만들 차례에요. 다음 명령어를 입력하여 앱을 빌드해 보세요.

::: code-group

```sh [npm]
npm run build
```

```sh [pnpm]
pnpm run build
```

```sh [yarn]
yarn build
```

:::

Granite 프레임워크가 최적화된 JavaScript 번들을 만들어요. 최적화된 번들은 `dist/` 디렉토리에 있어요.

<img src="../../../public/getting-started/bundle-size.png" style="margin: 0 auto; max-width: 500px; width: 100%;" />

> **✅ 성공했다면:** 각각 200KB 미만인 빌드된 번들이 보여요

## 🎉 축하해요!

첫 Granite 앱을 성공적으로 만들었어요! 지금까지 이런 것들을 해냈어요:

- ✅ 새로운 Granite 프로젝트 생성
- ✅ 개발 환경 설정
- ✅ 첫 마이크로서비스 화면 제작
- ✅ 화면 간 이동 추가
- ✅ 프로덕션용 번들 생성

## 다음 단계

이제 작동하는 Granite 앱이 생겼으니, 다음 단계로 넘어갈 수 있어요:

1. **[AWS 인프라 설정하기](./setup-aws)** - 번들을 위한 CDN 인프라 구성
2. **[프로덕션 배포하기](./deploy-your-app)** - AWS CDN에 번들을 배포하는 방법 배우기
3. **[고급 라우팅](../granite-router/routing)** - 타입-세이프 라우팅과 내비게이션에 대해 배우기

## 참고 링크

- 📖 [문서](../../index) - Granite 완벽 가이드
- 🐛 [GitHub 이슈](https://github.com/toss/granite/issues) - 버그 신고나 기능 요청하기
