# RNComponentView example

A React Native 0.81 app whose native screen shows the React Native component
`ComponentViewDemo` in three `RNComponentView`s, one per sizing, on Android and
iOS.

- `index.js` installs the provider recorder, then registers `RendererHost` and
  `ComponentViewDemo`.
- `RendererHost` mounts `RNComponentViewRenderer`. The app runs it in a surface
  that shows nothing itself: `MainApplication` starts a surface that no view
  displays on Android, and `AppDelegate` puts its root view behind the
  navigation controller, with touches off, on iOS.
- The native screen, `MainActivity` on Android and
  `ComponentViewDemoViewController` on iOS, creates the views before React
  Native starts and activates them once the renderer is attached.
- Add item and Remove item change the component's props, Toggle width narrows
  the `contentHeight` view, and the component's button counts its presses.

The example links `@granite-js/rn-component-view` and
`@granite-js/micro-frontend` from this repository. It does not use Granite:
Metro resolves `@granite-js/react-native`, which `@granite-js/micro-frontend`
imports, to `graniteReactNativeStub.js`.

## Run

Install the dependencies from this directory:

```sh
npm install
```

Start Metro:

```sh
npm start
```

In another terminal, run the Android app:

```sh
npm run android
```

or install the Pods and run the iOS app:

```sh
bundle install
cd ios && bundle exec pod install && cd ..
npm run ios
```
