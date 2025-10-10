# Granite &middot; [![Apache 2.0 License](https://img.shields.io/badge/license-Apache-blue.svg)](https://github.com/toss/slash/blob/main/LICENSE) [![NPM badge](https://img.shields.io/npm/v/@granite-js/react-native?logo=npm)](https://www.npmjs.com/package/@granite-js/react-native) [![codecov](https://codecov.io/gh/toss/granite/graph/badge.svg?token=LCP519I5BN)](https://codecov.io/gh/toss/granite)

[English](https://github.com/toss/granite/blob/main/README.md) | 한국어

Granite는 브라운필드 통합, 200KB 번들 크기, AWS 지원 인프라를 갖춘 마이크로서비스 앱을 위한 엔터프라이즈급 React Native 프레임워크입니다.

- **기존 앱에 리액트 네이티브 추가** - 리액트 네이티브 화면을 현재 iOS 및 Android 앱에 쉽게 통합할 수 있습니다.
- **작은 번들** - 번들 분할과 스마트 최적화를 통해 작은 200KB 마이크로서비스 번들을 생성합니다.
- **빠른 빌드** - ESBuild를 사용하여 JavaScript 번들 빌드 시간을 단 몇 초로 단축하세요.
- **전체 AWS 설정** - 전체 배포 제어를 통해 완벽한 인프라 구성.
- **원클릭 인프라** - 단일 CLI 명령으로 CDN 및 인프라를 설정합니다.
- **단순 기본값** - 사전 구성된 설정으로 설정이 아닌 구축에 집중할 수 있습니다.
- **종합적인 종단 간 테스트** - 모든 기능에는 종단 간 테스트가 포함되어 있습니다.
- **빠른 네이티브 빌드** - 미리 구축된 프레임워크로 네이티브 빌드 시간을 빠르게 유지하세요. (WIP)

## 시작하기

Granite를 시작하는 것은 간단합니다. 먼저, 저희 CLI를 사용하여 새로운 Granite 앱을 만드세요:

```sh
npx create-granite-app@latest
```

리액트 네이티브 구성 요소를 작성한 후, 하나의 명령으로 앱을 빌드하세요:

```sh
npm run granite build
```

### 인프라 설정

Granite는 인프라 설정을 단순화하기 위해 [Pulumi](https://www.pulumi.com/) 을 사용해요. '@granite-js/pulumi-aws'를 사용하는 몇 줄의 코드만 있으면 전체 React Native 인프라를 AWS에 배포할 수 있습니다:

```typescript
import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { ReactNativeBundleCDN } from '@granite-js/pulumi-aws';

const config = new pulumi.Config();

new ReactNativeBundleCDN('myReactNativeBundleCDN', {
  bucketName: config.require('bucketName'),
  region: config.require('region'),
});
```

### 앱 배포하기

단 하나의 명령으로 앱을 프로덕션 환경에 배포하세요. Forge가 번들을 업로드하고 CDN에 올리는 등 나머지 작업을 처리해줘요.

```sh
npm run granite-forge deploy --bucket your-s3-bucket-name
```

간단한 단계별 가이드를 원하시면 [시작 가이드](https://granite.run/guides/quick-start/create-your-app.html)를 방문해 주세요.

## 기여하기

커뮤니티에 있는 모든 분들에게 기여를 환영해요. 아래에 작성되어 있는 기여 가이드를 확인하세요.

[CONTRIBUTING](https://github.com/toss/granite/blob/main/.github/CONTRIBUTING.md)

## 라이선스

Apache 2.0 © Viva Republica, Inc. 자세한 내용은 [LICENCE](/LICENCE)를 참고하세요.

<a title="Toss" href="https://toss.im">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://static.toss.im/logos/png/4x/logo-toss-reverse.png">
    <img alt="Toss" src="https://static.toss.im/logos/png/4x/logo-toss.png" width="100">
  </picture>
</a>
