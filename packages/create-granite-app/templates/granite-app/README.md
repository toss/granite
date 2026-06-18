# %%appName%%

This is a Granite app created with `create-granite-app`.

## Getting started

Install dependencies:

```sh
%%packageManager%% install
```

Start the dev server:

```sh
%%packageManager%% run dev
```

## Scripts

- `%%packageManager%% run dev`: starts the Granite dev server.
- `%%packageManager%% run build`: builds the app bundle.
- `%%packageManager%% run test`: runs Jest.
- `%%packageManager%% run typecheck`: checks TypeScript types.

## Project files

- `granite.config.ts` defines the Granite app name, URL scheme, and plugins.
- `src/_app.tsx` registers the app container.
- `pages/` contains route files used by the router plugin.
- `require.context.ts` wires page discovery for the app.
