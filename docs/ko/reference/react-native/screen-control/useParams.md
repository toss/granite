---
sourcePath: packages/react-native/src/router/createRoute.ts
---

# useParams

`useParams`는 지정된 라우트에서 파라미터를 가져오는 훅이에요.
이 훅을 사용하면 현재 라우트의 파라미터에 쉽게 접근할 수 있어요.
`validateParams` 옵션을 사용하면 파라미터 구조를 검증하고 타입을 변환할 수 있어서 런타임 에러를 줄이고 안전한 코드를 작성할 수 있어요.

## 시그니처

```typescript
function useParams<TScreen extends keyof RegisterScreen>(options: {
  from: TScreen;
  strict?: true;
}): RegisterScreen[TScreen];
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">options</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">GraniteRouteHooksOptions&lt;TScreen&gt;</span>
    <br />
    <p class="post-parameters--description">가져올 라우트의 정보를 담은 객체예요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">options.from</span><span class="post-parameters--type">string</span>
        <br />
        <p class="post-parameters--description">파라미터를 가져올 라우트 경로예요. 이 값을 지정하지 않으면 현재 라우트에서 파라미터를 가져와요. 엄격 모드(<code>strict</code>)가 <code>true</code>인 경우 반드시 지정해야 해요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">options.strict</span><span class="post-parameters--type">boolean</span>
        <br />
        <p class="post-parameters--description">엄격 모드 설정이에요. <code>true</code>로 설정하면 지정된 라우트와 현재 라우트가 일치하지 않으면 에러를 발생시켜요. <code>false</code>로 설정하면 <code>validateParams</code> 검증을 생략하고 현재 화면의 파라미터를 그대로 반환해요.</p>
      </li>
    </ul>
  </li>
</ul>

## 예제

### 라우트 파라미터 가져오기

::: code-group

```tsx [pages/examples/use-params.tsx]
import React from 'react';
import { Text } from 'react-native';
import { createRoute, useParams } from '@granite-js/react-native';

export const Route = createRoute('/examples/use-params', {
  validateParams: (params) => params as { id: string },
  component: UseParamsExample,
});

function UseParamsExample() {
  // 첫 번째 방법: 라우트 객체의 `useParams` 메서드 사용
  const params = Route.useParams();

  // 두 번째 방법: useParams 훅 직접 사용
  const params2 = useParams({ from: '/examples/use-params' });

  // 세 번째 방법: strict 모드를 false로 설정하여 사용
  // strict: false로 설정하면 현재 라우트의 파라미터를 가져오며,
  // validateParams가 정의되어 있어도 검증을 건너뛰어요.
  const params3 = useParams({ strict: false }) as { id: string };

  return (
    <>
      <Text>{params.id}</Text>
      <Text>{params2.id}</Text>
      <Text>{params3.id}</Text>
    </>
  );
}
```

:::
