---
sourcePath: 'packages/react-native/src/router/components/useRouterBackHandler.tsx'
---

# useRouterBackHandler

네비게이션에서 뒤로가기 동작을 처리할 수 있는 핸들러를 제공하는 훅이에요. 모달이나 독립적인 화면에서 뒤로가기 버튼을 눌렀을 때 네비게이션 스택이 없는 경우 뷰를 직접 닫아야 할 때 사용할 수 있어요. 이 훅은 `@react-navigation/native`에서 제공하는 `NavigationContainerRef`를 사용해서 네비게이션 스택이 남아 있다면 이전 화면으로 이동하고, 스택이 비어 있다면 사용자가 설정한 `onClose` 함수를 실행해요.

## 시그니처

```typescript
function useRouterBackHandler({
  navigationContainerRef,
  onClose,
}: {
  navigationContainerRef: NavigationContainerRefWithCurrent<never>;
  onClose?: () => void;
}): { handler: any };
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">navigationContainerRef</span><span class="post-parameters--required">Required</span> · <span class="post-parameters--type">NavigationContainerRefWithCurrent&lt;any&gt;</span>
    <br/>
    <p class="post-parameters--description">현재 네비게이션 상태를 참조할 수 있는 <code>NavigationContainerRef</code>예요. 뒤로가기 동작을 실행할 때 사용돼요.</p>
  </li>
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">onClose</span> · <span class="post-parameters--type">() =&gt; void</span>
    <br/>
    <p class="post-parameters--description">네비게이션 스택이 비어 있을 때 실행할 함수예요. 예를 들어, React Native View 를 닫는 함수를 전달할 수 있어요.</p>
  </li>
</ul>

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">{ handler: () =&gt; void }</span>
    <br/>
    <p class="post-parameters--description">뒤로가기 버튼 등에서 사용할 수 있는 핸들러 함수예요.
</p>
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
    onClose: () => {
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
