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
        "preludeScript": "import { registerShared, createContainer, exposeModule, toDuplicateTolerantNativeComponentRegistry } from '@granite-js/plugin-micro-frontend/runtime';
      const __container = createContainer('test', {"remote":{"host":"localhost","port":8082},"shared":{"react":{"eager":true},"react-native":{"eager":true}}});

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
