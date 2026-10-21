import { installComponentProviderRecorder } from '@granite-js/rn-component-view';
import { AppRegistry } from 'react-native';
import { ComponentViewDemo } from './src/ComponentViewDemo';
import { RendererHost } from './src/RendererHost';

// Records the components registered below, so RNComponentViews can show them. The recorder sees only registrations
// made after it runs, and imports run before this call: when imported modules register components, install it in a
// module of its own and import that module first. See "Installing the provider recorder" in the package README.
installComponentProviderRecorder();

// The native app starts a surface of `RendererHost`, which draws the components of every RNComponentView.
AppRegistry.registerComponent('RendererHost', () => RendererHost);
// The component the native demo screens show in RNComponentViews.
AppRegistry.registerComponent('ComponentViewDemo', () => ComponentViewDemo);
