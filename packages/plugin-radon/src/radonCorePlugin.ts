import path from 'path';
import type { GranitePluginCore } from '@granite-js/plugin-core';

export interface RadonCorePluginOptions {
  enableJSXSource?: boolean;
  enableNavigationAutoRegister?: boolean;
  enableRouteScanning?: boolean;
  enableRendererReplacement?: boolean;
}

const DEFAULT_OPTIONS: Required<RadonCorePluginOptions> = {
  enableJSXSource: true,
  enableNavigationAutoRegister: true,
  enableRouteScanning: true,
  enableRendererReplacement: true,
};

export const radonCore = (options: RadonCorePluginOptions = DEFAULT_OPTIONS): GranitePluginCore => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  return {
    name: 'radon-core-plugin',
    config: {
      babel: {
        plugins: [
          [path.resolve(__dirname, './babel.cjs'), {
            ...mergedOptions
          }],
        ]
      },
      metro: {
        serializer: {
          getPolyfills: () => {
            if (!(global as any).RADON_WATCH_FOLDERS_OUTPUTTED) {
              const extensionLib = process.env.RADON_IDE_LIB_PATH;
              if (extensionLib) {
                process.stdout.write(JSON.stringify({
                  type: "RNIDE_watch_folders",
                  watchFolders: [extensionLib]
                }) + "\n");
                (global as any).RADON_WATCH_FOLDERS_OUTPUTTED = true;
              }
            }
          return [];
        }
      },
        reporter: {
          update(event:any) {
            if (Object.prototype.toString.call(event.error) === "[object Error]") {
              event = Object.assign(event, {
                message: event.error.message,
                stack: event.error.stack,
              });
            }
            process.stdout.write(JSON.stringify(event) + "\n");
          }
        }
      }
    }
  };
};
