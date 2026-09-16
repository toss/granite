# Next Plugin API

`@granite-js/micro-frontend/plugin-next` provides the module sharing plugin as a `PluginOption`.

```ts
import { microFrontend } from '@granite-js/micro-frontend/plugin-next';

const plugins = [
  microFrontend({
    appName: 'my-service',
    shared: ['react', 'react-native'],
    exposes: { './App': './src/App.tsx' },
  }),
];
```

Hosts use `shared: { react: { eager: true } }` to register bundled modules. Remotes resolve non-eager modules from the shared registry. Shared exports remain live, and disposal callbacks are scoped to the application.
