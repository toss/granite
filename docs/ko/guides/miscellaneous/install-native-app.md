# 테스트 앱 설치하기

Granite 테스트 앱은 배포한 번들을 테스트할 수 있는 앱이에요. 이 문서에서는 iOS 시뮬레이터와 안드로이드 기기에서 Granite 테스트 앱을 설치하고 초기 설정하는 방법을 안내해요.

## <span style="display:inline-flex; align-items:center; gap:5px;"><img src="/icons/apple.svg" alt="Apple iOS" width="24" height="24" style="margin-top:-4px"> iOS 시뮬레이터 설치 가이드 </span>

iOS에서 React Native 앱을 테스트하려면 시뮬레이터가 필요해요. 시뮬레이터는 macOS에서 `Xcode`를 설치하면 함께 제공돼요.

아래 가이드를 따라 앱을 설치하세요.

### 준비물

- macOS
- Xcode (App Store에서 설치 가능해요)

### 설치 방법

1. GitHub 릴리스에서 Granite iOS 앱 번들을 다운로드해요:  
   **[모든 릴리스 보기](https://github.com/toss/granite/releases)**
   
   - **안정적인 사용**: "Pre-release" 배지나 `alpha`/`beta`/`rc`가 없는 릴리스를 선택하세요
   - **테스트 목적**: 최신 기능을 시도해보고 싶다면 Pre-release 버전도 사용할 수 있어요
   - Assets 섹션에서 `granite_ios.zip` 파일을 다운로드해요

2. 다운로드한 `granite_ios.zip` 파일의 압축을 풀어요.

3. `.app` 파일을 `Xcode`의 iOS 시뮬레이터 창으로 드래그해서 설치해요.  
   드래그앤드롭하면 시뮬레이터에 앱이 복사돼요.

## <span style="display:inline-flex; align-items:center; gap:5px;"><img src="/icons/android.svg" alt="Android" width="24" height="24" style="margin-top:-2px"> 안드로이드 설치 가이드 </span>

### 준비물

- Android 기기 또는 에뮬레이터
- ADB(Android Debug Bridge) 설치 (Android Studio 설치 시 함께 제공돼요)

### 설치 방법

1. GitHub 릴리스에서 Granite Android APK를 다운로드해요:  
   **[모든 릴리스 보기](https://github.com/toss/granite/releases)**
   
   - **안정적인 사용**: "Pre-release" 배지나 `alpha`/`beta`/`rc`가 없는 릴리스를 선택하세요
   - **테스트 목적**: 최신 기능을 시도해보고 싶다면 Pre-release 버전도 사용할 수 있어요
   - Assets 섹션에서 `granite_android.zip` 파일을 다운로드해요

2. 다운로드한 `granite_android.zip` 파일의 압축을 풀어요.

3. 설치 방법 중 하나를 선택해요.

#### ADB 명령어로 설치

- 컴퓨터에 안드로이드 기기를 연결한 뒤, 터미널에서 아래 명령어를 실행해요.
  ```bash
  adb install granite_android.zip
  ```

#### 기기에서 직접 설치

1. 다운로드한 APK 파일을 안드로이드 기기로 복사해요.
2. 기기에서 파일 탐색기를 열고 APK 파일을 눌러 설치해요.  
   보안 설정에서 '알 수 없는 앱 설치 허용'이 필요할 수 있어요.

## 초기 설정

앱을 처음 실행하면 번들을 불러올 CDN 주소와 딥링크 스킴(scheme)을 입력해야 해요. Granite에서는 테스트용으로 사용할 수 있는 값들을 제공해요.

| 설정 항목      | 값                                            | 설명                                             |
| -------------- | --------------------------------------------- | ------------------------------------------------ |
| **Host**       | `https://d2dzky5bdhec40.cloudfront.net`       | 체험용 번들 CDN 주소예요. 테스트용으로 제공돼요. |
| **URL Scheme** | `granite://showcase` <br> `granite://counter` | 앱에서 딥링크를 처리할 때 사용하는 스킴이에요.   |

위 값을 Granite 테스트 설정에 입력해서 앱을 실행해보세요.

| iOS                                                                                                                                                                                                            | Android                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/ios_showcase.mp4" type="video/mp4" /> 브라우저가 비디오 태그를 지원하지 않습니다. </video> | <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/android_showcase.mov" type="video/mp4" /> 브라우저가 비디오 태그를 지원하지 않습니다. </video> |