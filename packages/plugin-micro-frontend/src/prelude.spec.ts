import { describe, it, expect } from 'vitest';
import { getPreludeConfig } from './prelude';

describe('prelude', () => {
  it('', () => {
    const config = getPreludeConfig({
      name: 'test',
      remote: {
        host: 'localhost',
        port: 8082,
      },
      shared: {
        react: {
          eager: true,
        },
        'react-native': {
          eager: true,
        },
      },
    });

    expect(config).toMatchInlineSnapshot(`
      {
        "banner": "if (global.__MICRO_FRONTEND__ == null) {
        global.__MICRO_FRONTEND__ = {
          __SHARED__: {},
          __INSTANCES__: [],
        };
      }",
        "preludeScript": "import { registerShared, createContainer, exposeModule } from '@granite-js/plugin-micro-frontend/runtime';
      const __container = createContainer('test', {"remote":{"host":"localhost","port":8082},"shared":{"react":{"eager":true},"react-native":{"eager":true},"react-native/Libraries/BatchedBridge/BatchedBridge":{"eager":true},"react-native/Libraries/BatchedBridge/NativeModules":{"eager":true},"react-native/Libraries/BatchedBridge/MessageQueue":{"eager":true},"react-native/Libraries/NativeComponent/NativeComponentRegistry":{"eager":true},"react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable":{"eager":true},"react-native/Libraries/NativeComponent/ViewConfigIgnore":{"eager":true},"react-native/Libraries/ReactNative/RendererProxy":{"eager":true},"react-native/Libraries/StyleSheet/PlatformColorValueTypes":{"eager":true},"react-native/Libraries/StyleSheet/normalizeColor":{"eager":true},"react-native/Libraries/StyleSheet/processColor":{"eager":true},"react-native/Libraries/TurboModule/TurboModuleRegistry":{"eager":true},"react-native/Libraries/Utilities/NativePlatformConstantsIOS":{"eager":true},"react-native/Libraries/Utilities/Platform":{"eager":true},"react-native/Libraries/Utilities/defineLazyObjectProperty":{"eager":true},"react/jsx-runtime":{"eager":true},"react/jsx-dev-runtime":{"eager":true}}});
      // react
      import * as __mod0 from 'react';
      registerShared('react', __mod0);
      // react-native
      import * as __mod1 from 'react-native';
      registerShared('react-native', __mod1);
      // react-native/Libraries/BatchedBridge/BatchedBridge
      import * as __mod2 from 'react-native/Libraries/BatchedBridge/BatchedBridge';
      registerShared('react-native/Libraries/BatchedBridge/BatchedBridge', __mod2);
      // react-native/Libraries/BatchedBridge/NativeModules
      import * as __mod3 from 'react-native/Libraries/BatchedBridge/NativeModules';
      registerShared('react-native/Libraries/BatchedBridge/NativeModules', __mod3);
      // react-native/Libraries/BatchedBridge/MessageQueue
      import * as __mod4 from 'react-native/Libraries/BatchedBridge/MessageQueue';
      registerShared('react-native/Libraries/BatchedBridge/MessageQueue', __mod4);
      // react-native/Libraries/NativeComponent/NativeComponentRegistry
      import * as __mod5 from 'react-native/Libraries/NativeComponent/NativeComponentRegistry';
      registerShared('react-native/Libraries/NativeComponent/NativeComponentRegistry', __mod5);
      // react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable
      import * as __mod6 from 'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable';
      registerShared('react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable', __mod6);
      // react-native/Libraries/NativeComponent/ViewConfigIgnore
      import * as __mod7 from 'react-native/Libraries/NativeComponent/ViewConfigIgnore';
      registerShared('react-native/Libraries/NativeComponent/ViewConfigIgnore', __mod7);
      // react-native/Libraries/ReactNative/RendererProxy
      import * as __mod8 from 'react-native/Libraries/ReactNative/RendererProxy';
      registerShared('react-native/Libraries/ReactNative/RendererProxy', __mod8);
      // react-native/Libraries/StyleSheet/PlatformColorValueTypes
      import * as __mod9 from 'react-native/Libraries/StyleSheet/PlatformColorValueTypes';
      registerShared('react-native/Libraries/StyleSheet/PlatformColorValueTypes', __mod9);
      // react-native/Libraries/StyleSheet/normalizeColor
      import * as __mod10 from 'react-native/Libraries/StyleSheet/normalizeColor';
      registerShared('react-native/Libraries/StyleSheet/normalizeColor', __mod10);
      // react-native/Libraries/StyleSheet/processColor
      import * as __mod11 from 'react-native/Libraries/StyleSheet/processColor';
      registerShared('react-native/Libraries/StyleSheet/processColor', __mod11);
      // react-native/Libraries/TurboModule/TurboModuleRegistry
      import * as __mod12 from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
      registerShared('react-native/Libraries/TurboModule/TurboModuleRegistry', __mod12);
      // react-native/Libraries/Utilities/NativePlatformConstantsIOS
      import * as __mod13 from 'react-native/Libraries/Utilities/NativePlatformConstantsIOS';
      registerShared('react-native/Libraries/Utilities/NativePlatformConstantsIOS', __mod13);
      // react-native/Libraries/Utilities/Platform
      import * as __mod14 from 'react-native/Libraries/Utilities/Platform';
      registerShared('react-native/Libraries/Utilities/Platform', __mod14);
      // react-native/Libraries/Utilities/defineLazyObjectProperty
      import * as __mod15 from 'react-native/Libraries/Utilities/defineLazyObjectProperty';
      registerShared('react-native/Libraries/Utilities/defineLazyObjectProperty', __mod15);
      // react/jsx-runtime
      import * as __mod16 from 'react/jsx-runtime';
      registerShared('react/jsx-runtime', __mod16);
      // react/jsx-dev-runtime
      import * as __mod17 from 'react/jsx-dev-runtime';
      registerShared('react/jsx-dev-runtime', __mod17);",
      }
    `);
  });
});
