---
sourcePath: packages/react-native/src/visibility/useVisibilityEffect.ts
---

# useVisibilityEffect

[useVisibility](./useVisibility)를 기준으로 화면이 보이는 동안 효과를 실행해요. 콜백이 반환한 cleanup 함수는 화면이 가려지거나, 콜백이 바뀌거나, 컴포넌트가 unmount될 때 실행돼요.

## 시그니처

```typescript
function useVisibilityEffect(effect: EffectCallback): void;
```

`effect`는 React의 `useEffect`와 같은 콜백 타입이에요. 동기 함수이며 cleanup 함수를 반환할 수 있어요. async 콜백을 전달하는 대신 콜백 안에서 비동기 작업을 시작하세요.

## 실행과 정리

- 처음부터 보이는 화면에서는 렌더가 반영된 후 실행해요. 가려진 상태로 mount되면 실행하지 않아요.
- 화면이 가려지면 실행 중인 효과를 정리하고, 다시 보이면 실행해요.
- 보이는 동안 콜백의 참조가 바뀌면 기존 효과를 정리한 후 새 콜백을 실행해요.
- 가려진 상태를 거치지 않고 바로 unmount돼도 실행 중인 효과를 정리해요.
- 개발 환경의 React Strict Mode에서는 실행과 정리가 추가로 한 번 일어날 수 있어요.

관계없는 리렌더링으로 효과가 다시 시작되지 않도록 필요한 의존성을 지정한 `useCallback`을 사용하세요.

## 예제

```tsx
import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useVisibilityEffect } from '@granite-js/react-native';

function Screen({ onBack }: { onBack: () => boolean }) {
  useVisibilityEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => subscription.remove();
    }, [onBack])
  );

  return null;
}
```

## 다른 가시성 훅과의 차이

- [useVisibility](./useVisibility)는 현재 가시성을 반환해요.
- [useVisibilityChange](./useVisibilityChange)는 deprecated API이며, `'visible'`, `'hidden'` 전환을 알려줘요. 콜백의 반환값을 cleanup으로 등록하지 않아요.
- `useVisibilityEffect`는 화면이 보이는 동안 유지할 효과를 실행하고 정리해요.

React Navigation의 `useFocusEffect`와 달리 `useVisibility`가 나타내는 네이티브 화면 가시성도 반영해요. 따라서 route의 focus가 유지되더라도 다른 네이티브 화면이 현재 화면을 가리면 정리할 수 있어요. 실행과 정리는 navigation 이벤트 리스너 안에서 동기적으로 이루어지는 대신 React의 effect 실행 시점을 따라요.
