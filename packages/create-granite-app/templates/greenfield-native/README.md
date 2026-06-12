# Granite Greenfield App

## Development

```sh
npm run dev
```

Debug builds use the React Native development server through `granite.config.ts`.
This app intentionally does not include `metro.config.js`, `react-native.config.js`, or Expo `app.json`.

iOS Release builds run `ios/scripts/bundle-granite.sh`, which calls `granite build` and embeds the iOS output as
`main.jsbundle`. Keep bundle configuration in `granite.config.ts` instead of adding a root Metro config file.

## Standalone Mode & Deep Links

This app is built with `standalone: true` in `granite.config.ts`, so it runs without a brownfield host:

- Deep links resolve directly against your routes: `%%scheme%%://about` opens `pages/about.tsx`.
  The scheme is registered in `ios/%%nativeAppName%%/Info.plist` and `android/app/src/main/AndroidManifest.xml`.
- Brownfield-only APIs from `@granite-js/react-native` (such as `closeView` and `getSchemeUri`) throw an error,
  since there is no host app to serve them.

## Release Bundle Loading

Release native builds load the JavaScript bundle in this order:

1. Local cached bundle downloaded by the native loader
2. Embedded React Native bundle packaged in the app
3. Remote bundle downloaded from the CDN URL produced by `granite forge`

After running `granite forge`, replace the empty remote bundle URL constants in both native files:

- `ios/%%nativeAppName%%/GreenfieldBundleLoader.swift`
- `android/app/src/main/java/%%androidPackagePath%%/GreenfieldBundleLoader.kt`

Keep the URL platform-specific when your forge output produces separate iOS and Android bundle URLs.
