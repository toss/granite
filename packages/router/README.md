# @granite-js/router

Standalone file-based routing for React Native. This package owns route definitions, navigation state, screen options, and back handlers. It does not depend on `@granite-js/react-native` or call host bridges.

Install compatible `@granite-js/native`, `react`, and `react-native` peers. The native hub supplies the shared React Navigation, safe-area, and SVG implementations. React Navigation remains the internal engine.

```tsx
import { useColorScheme } from 'react-native';
import { Router } from '@granite-js/router';
import { context } from './require.context';

export function App({ initialUrl }: { initialUrl?: string }) {
  const dark = useColorScheme() === 'dark';
  return (
    <Router
      context={context}
      prefix="example://app"
      initialUrl={initialUrl}
      defaultScreenOptions={({ routeIndex }) => ({
        title: routeIndex === 0 ? 'Welcome' : 'Details',
        headerTintColor: dark ? 'white' : 'black',
      })}
    />
  );
}
```

Call hooks in the component that renders Router, never in the options callback. Updating options preserves the mounted stack. The callback receives `route`, `navigation`, `theme`, `routeIndex`, and `onBack`.

- `routeIndex` is the route's zero-based stack position, not the focused index. A preloaded route outside the stack has index `-1`.
- `onBack` runs registered handlers before going back or invoking the optional `onRootBack` callback at the root.
- `isActive` overrides AppState when the host owns activity. An inactive router does not register back handlers. Without this prop, Router tracks AppState.
- `initialUrl` and optional `getInitialUrl` are entry configuration, not commands to reset a mounted stack.

For registered Granite apps, `@granite-js/react-native/router` provides a thin Router adapter that forwards host activity. Its route factories and back hooks are re-exports of this package, sharing the same registry and contexts.

Use `@granite-js/plugin-router` to generate file-based route types. New generated declarations augment `@granite-js/router`; existing root imports from `@granite-js/react-native` remain compatible.
