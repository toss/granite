# Rollipop

```ts
import { microFrontend } from '@granite-js/micro-frontend/plugin';

const plugins = [
  microFrontend({
    appName: 'my-service',
    shared: ['react', 'react-native'],
    exposes: { './App': './src/App.tsx' },
  }),
];
```

Hosts use `shared: { react: { eager: true } }` to register bundled modules. Remotes resolve non-eager modules from the shared registry. Shared exports remain live, and disposal callbacks are scoped to the application.
