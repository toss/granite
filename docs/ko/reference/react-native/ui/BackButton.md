---
sourcePath: 'packages/react-native/src/router/components/BackButton.tsx'
---

# BackButton

뒤로 가기 버튼 컴포넌트예요. 이 컴포넌트는 주로 네비게이션 헤더나 커스텀 화면 상단에서 이전 화면으로 돌아가는 기능을 구현할 때 사용해요. `onPress` 핸들러를 설정하지 않으면 아무 동작도 하지 않아요.

## 시그니처

```typescript
function BackButton({ tintColor, onPress }: BackButtonProps): any;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--required">Required</span> · <span class="post-parameters--type">Object</span>
    <br/>
    <p class="post-parameters--description"></p>
    <ul class="post-parameters-ul">
  <li class="post-parameters-li ">
    <span class="post-parameters--name">tintColor</span> · <span class="post-parameters--type">string</span>
    <br/>
    <p class="post-parameters--description">버튼 아이콘의 색상이에요. CSS 색상 문자열을 사용할 수 있어요.</p>
  </li>
  <li class="post-parameters-li ">
    <span class="post-parameters--name">onPress</span> · <span class="post-parameters--type">() =&gt; void</span>
    <br/>
    <p class="post-parameters--description">버튼을 눌렀을 때 실행할 함수예요. 예를 들어 이전 화면으로 돌아가는 함수를 넣을 수 있어요.</p>
  </li>
    </ul>
  </li>
</ul>

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">ReactElement</span>
    <br/>
    <p class="post-parameters--description">뒤로가기 버튼 컴포넌트를 반환해요.</p>
  </li>
</ul>

## 예제

### 뒤로가기 버튼에 직접 핸들러를 전달하고 뷰를 닫을 수 있는 함수를 설정하는 예제

```tsx
import { createNavigationContainerRef, useNavigation } from '@granite-js/native/@react-navigation/native';
import { BackButton, useRouterBackHandler } from '@granite-js/react-native';
import { useEffect } from 'react';

const navigationContainerRef = createNavigationContainerRef();

function MyBackButton() {
  const navigation = useNavigation();

  const { handler } = useRouterBackHandler({
    navigationContainerRef,
    closeFn: () => {
      // close the view
    },
  });

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <BackButton onPress={handler} />,
    });
  }, [handler, navigation]);

  return <></>;
}
```
