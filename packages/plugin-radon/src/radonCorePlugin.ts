import type { GranitePluginCore } from '@granite-js/plugin-core';

export const radonCore = (): GranitePluginCore => {
  return {
    name: 'radon-metro-reporter',
    config: {
      metro: {  
        reporter: {
          update(event: any) {
            if (Object.prototype.toString.call(event.error) === '[object Error]') {
              event = Object.assign(event, {
                message: event.error.message,
                stack: event.error.stack,
              });
            }
            process.stdout.write(JSON.stringify(event) + '\n');
          },
        },
      },
    },
  };
};
