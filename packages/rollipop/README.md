# @granite-js/rollipop

The Rollipop bundler adapter for Granite.

```ts
// granite.config.ts
import { defineConfig } from '@granite-js/react-native/config';
import { rollipop } from '@granite-js/rollipop';

export default defineConfig({
  appName: 'my-service',
  scheme: 'granite',
  bundler: rollipop(),
});
```

```ts
// rollipop.config.ts
import { defineConfig } from 'rollipop';

export default defineConfig({
  entry: './index.ts',
  plugins: [],
});
```

`rollipop()` loads `rollipop.config.ts` by default. Use `rollipop({ configFile: './custom.rollipop.ts' })` to load another configuration file.

The configuration uses Rollipop's configuration and plugin interfaces. The adapter delegates builds and development servers to Rollipop.
