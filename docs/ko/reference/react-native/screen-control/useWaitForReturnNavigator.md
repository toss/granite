---
sourcePath: packages/react-native/src/react/useWaitForReturnNavigator.ts
---
# useWaitForReturnNavigator



화면 전환을 하고 돌아왔을 때 다음 코드를 동기적으로 실행할 수 있도록 도와주는 Hook 이에요.
화면 이동은 [@react-navigation/native `useNavigation`의 `navigate`](https://reactnavigation.org/docs/6.x/navigation-prop#navigate)를 사용해요.

예를 들어, 사용자가 다른 화면으로 이동했다가 돌아왔다는 로그를 남기고 싶을 때 사용해요.

## 시그니처

```typescript
function useWaitForReturnNavigator<T extends Record<string, object | undefined>>(): <RouteName extends keyof T>(route: RouteName, params?: T[RouteName]) => Promise<void>;
```











## 예제

### 화면 이동 후 돌아왔을 때 코드가 실행되는 예제

**"이동하기"** 버튼을 누르면 다른 화면으로 이동하고, 돌아왔을 때 로그가 남겨져요.

```tsx
import { Button } from 'react-native';
import { useWaitForReturnNavigator } from '@granite-js/react-native';

export function UseWaitForReturnNavigator() {
  const navigate = useWaitForReturnNavigator();

  return (
    <>
      <Button
        title="이동하기"
        onPress={async () => {
          console.log(1);
          await navigate('/examples/use-visibility');
          // 화면에 돌아오면 이 코드가 실행됩니다.
          console.log(2);
        }}
      />
    </>
  );
}
```