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
          singleton: true,
          eager: true,
        },
        'react-native': {
          singleton: true,
          eager: true,
        },
      },
    });

    expect(config).toMatchInlineSnapshot(`
      {
        "banner": "
          if (global.__SHARED_MODULES__ == null) {
            global.__SHARED_MODULES__ = {
              __SHARED__: {},
              __INSTANCES__: [],
            };
          }
          ",
        "preludeScript": "import { registerShared, createContainer } from '@granite-js/plugin-shared-modules/runtime';
      createContainer('test', {"remote":{"host":"localhost","port":8082},"shared":{"react":{"singleton":true,"eager":true},"react-native":{"singleton":true,"eager":true}}});

          // react
          import * as __mod0 from 'react';
          registerShared('react', __mod0);
          

          // react-native
          import * as __mod1 from 'react-native';
          registerShared('react-native', __mod1);
          ",
      }
    `);
  });
});
