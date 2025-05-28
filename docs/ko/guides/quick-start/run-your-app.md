# 앱 실행하기

앱을 `granite-forge`로 배포하고 번들 주소를 알게 됐다면, 샌드박스 앱에서 직접 실행해볼 수 있어요. 아래 순서를 따라 설정하면 간단하게 실행할 수 있어요.

샌드박스 앱이 아직 없다면 [샌드박스 앱 설치하기](/ko/guides/quick-start/install-native-app) 문서를 먼저 확인해 주세요.

## 1. 필수 정보 확인하기

`granite.config.ts` 파일에서 앱 실행에 필요한 `scheme`과 `appName` 값을 확인해요

```ts
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  // 실행 스킴 예시: granite://showcase
  scheme: 'granite',
  appName: 'showcase',
  plugins: [
    // ...
  ],
});
```

## 2. 샌드박스 앱에 설정 입력하기

샌드박스 앱을 열고 다음 정보를 입력해 주세요.

- **Host**: `https://<cloudfront-cdn>`  
  앱 번들이 올라가 있는 CDN(Content Delivery Network) 주소예요.
- **URL Scheme**: `<scheme>://<appName>`  
  예: `granite://showcase`

이 설정을 저장하면 앱을 샌드박스 환경에서 실행할 수 있어요.

## 3. 앱 실행과 번들 파일 주소 구조

앱을 실행하면 지정된 스킴을 기준으로 번들 파일을 불러와요. 예를 들어 `granite://example` 스킴을 사용하면 다음과 같은 구조의 주소에서 번들 파일을 가져와요.

`1-1000`은 네이티브 앱에서 자동으로 지정하는 그룹 식별자예요. 카나리(Canary) 배포처럼 사용자 그룹마다 서로 다른 번들을 내려줄 때 이 숫자를 사용해요.

- **iOS**

  - 공유 번들: `https://<cloudfront-cdn>/ios/shared/1-1000/bundle`
  - 앱 전용 번들: `https://<cloudfront-cdn>/ios/example/1-1000/bundle`

- **Android**
  - 공유 번들: `https://<cloudfront-cdn>/android/shared/1-1000/bundle`
  - 앱 전용 번들: `https://<cloudfront-cdn>/android/example/1-1000/bundle`

## 실행 예시 영상

| iOS                                                                                                                                                                                                            | Android                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/ios_showcase.mp4" type="video/mp4" /> 브라우저가 비디오 태그를 지원하지 않습니다. </video> | <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/android_showcase.mov" type="video/mp4" /> 브라우저가 비디오 태그를 지원하지 않습니다. </video> |
