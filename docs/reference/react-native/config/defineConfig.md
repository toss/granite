---
sourcePath: packages/cli/src/config/defineConfig.ts
---

# defineConfig

Configures your Granite application by defining key settings in `granite.config.ts`.

The configuration lets you specify:

- How users will access your app through a URL scheme (e.g. `granite://`)
- Your app's unique name that appears in the URL (e.g. `granite://my-service`)
- Build settings for bundlers like ESBuild and Metro
- Code transformation settings through Babel
- Additional functionality through Granite plugins

## Signature

```typescript
function defineConfig({
  appName,
  host,
  scheme,
  plugins,
  outdir,
  entryFile,
  cwd,
  mpack,
  babel,
  esbuild,
  metro,
}: GraniteConfigInput): Promise<GraniteConfigResponse>;
```

## Parameters

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">config</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">GraniteConfigInput</span>
    <br />
    <p class="post-parameters--description">Configuration options for your Granite application that define key settings like URL scheme, app name, build settings, and plugins.</p>
  </li>
</ul>

The configuration options include:

- `appName`: Your app's unique identifier that appears in URLs (e.g., 'my-service')
- `host`: You can configure the `host` part of the URL scheme. This is optional, and the system works even if you don’t set it. If specified, the host is added before the `appName` in the path.  
  For example, if you set the `host` to `super`, the scheme will be structured as `{scheme}://super/{appName}`.
- `scheme`: URL scheme for launching your app (e.g., 'granite')
- `plugins`: Granite plugins to enhance functionality
- `outdir`: Where to output build files (defaults to 'dist')
- `entryFile`: Your app's entry point (defaults to './src/\_app.tsx')
- `cwd`: Working directory for build process (defaults to process.cwd())
- `mpack`: Fine-tune mpack bundler behavior
- `babel`: Customize Babel transpilation
- `esbuild`: Adjust ESBuild bundling
- `metro`: Configure Metro bundler settings

## Example

### Basic Configuration

Here's a basic configuration that:

- Makes your app accessible via the `granite://` scheme
- Names your service "my-app" so it's reachable at `granite://my-app`
- Uses the Hermes plugin to optimize JavaScript bundles into bytecode

```typescript
import { defineConfig } from '@granite-js/react-native/config';
import { hermes } from '@granite-js/plugin-hermes';

export default defineConfig({
  // The name of your microservice
  appName: 'my-app',
  // (Optional) The host name for your app (e.g. 'scheme://host/app-name')
  host: 'super',
  // The URL scheme for deep linking
  scheme: 'granite',
  // Entry file path
  entryFile: 'index.ts',
  // Array of plugins to use
  plugins: [hermes()],
});
```
