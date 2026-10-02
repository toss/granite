# @granite-js/rollipop

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

See the [Rollipop configuration documentation](https://rollipop.dev/docs/get-started/configuration) for `rollipop.config.ts` options. To load another configuration file, pass `rollipop({ configFile: './custom.rollipop.ts' })`.
