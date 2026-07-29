---
sourcePath: packages/react-native/src/use-back-event/useBackHandler.tsx
---

# useBackHandler

뒤로 가기 동작을 가로채는 백 핸들러를 등록하는 Hook이에요. 이 Hook을 사용하면 뒤로 가기 버튼을 눌렀을 때 화면을 벗어나는 대신 오버레이를 먼저 닫는 것처럼, 조건에 따라 뒤로 가기 동작을 다르게 처리할 수 있어요.

이 Hook은 지원 종료 예정인 [useBackEvent](/ko/reference/react-native/screen-control/useBackEvent)를 대체해요. 백 핸들러는 `useBackEvent`로 등록한 핸들러보다 먼저 실행돼요.

`addEventListener`로 핸들러를 등록해요. 핸들러를 등록하면 구독 객체를 반환하고, 구독 객체의 `remove` 메서드를 호출하면 핸들러를 제거해요.

뒤로 가기 동작(뒤로 가기 버튼, iOS 스와이프 제스처, Android 하드웨어 백 버튼)이 발생하면 등록된 핸들러가 등록 순서의 역순으로 실행돼요. 가장 나중에 등록한 핸들러가 가장 먼저 실행돼요. 각 핸들러는 뒤로 가기 동작의 출처(`source`)가 담긴 `BackEvent` 객체를 받아요.

핸들러의 반환 값으로 뒤로 가기 동작을 이어갈지 결정해요.

- `true`를 반환하면 뒤로 가기 동작이 여기서 끝나요. 남은 핸들러를 실행하지 않고, 기본 뒤로 가기 동작도 실행하지 않아요.
- `false`를 반환하거나 아무것도 반환하지 않으면 다음 핸들러가 이어서 실행돼요.

등록된 핸들러는 사용자가 화면을 보고 있을 때만 동작해요. 화면을 보고 있는지는 [useVisibility](/ko/reference/react-native/screen-control/useVisibility)로 판단해요.

## 시그니처

```typescript
function useBackHandler(): BackHandlerControls;
```

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">BackHandlerControls</span>
    <br />
    <p class="post-parameters--description">백 핸들러를 등록할 수 있는 객체예요. <code>addEventListener</code> 메서드로 <code>(event: BackEvent) =&gt; boolean | void</code> 타입의 핸들러를 등록해요. 이 메서드는 <code>remove</code> 메서드가 담긴 구독 객체를 반환하고, <code>remove</code>를 호출하면 등록한 핸들러를 제거해요.</p>
  </li>
</ul>

### 에러

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">Error</span>
    <br />
    <p class="post-parameters--description">이 훅을 <code>BackEventProvider</code> 안에서 사용하지 않으면 에러가 발생해요.</p>
  </li>
</ul>

## 예제

### 오버레이를 먼저 닫는 예제

- **오버레이가 열려 있을 때 뒤로 가기 버튼을 누르면, 뒤로 가는 대신 오버레이를 닫아요.** 핸들러가 `true`를 반환해서 뒤로 가기 동작이 여기서 끝나요.
- **오버레이가 닫혀 있을 때 뒤로 가기 버튼을 누르면, 기존 동작대로 정상적으로 뒤로 가요.** 핸들러가 아무것도 반환하지 않아서 뒤로 가기 동작이 이어져요.

```tsx
import { useEffect, useState } from 'react';
import { Button, View } from 'react-native';
import { useBackHandler } from '@granite-js/react-native';

export function OverlayExample() {
  const backHandler = useBackHandler();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  useEffect(() => {
    const subscription = backHandler.addEventListener(() => {
      if (isOverlayOpen) {
        setIsOverlayOpen(false);
        return true;
      }

      return undefined;
    });

    return () => {
      subscription.remove();
    };
  }, [backHandler, isOverlayOpen]);

  return (
    <View>
      <Button title="Open Overlay" onPress={() => setIsOverlayOpen(true)} />
    </View>
  );
}
```
