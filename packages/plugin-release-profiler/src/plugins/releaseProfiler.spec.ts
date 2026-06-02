import { describe, expect, it } from 'vitest';
import { releaseProfiler } from './releaseProfiler';

describe('releaseProfiler', () => {
  it('enables development globals when requested', () => {
    const plugin = releaseProfiler({ enabled: true });
    const config = plugin.config as any;

    expect(config).toMatchObject({
      esbuild: {
        define: {
          __DEV__: 'true',
          'process.env.NODE_ENV': '"development"',
        },
      },
    });
    expect(config?.esbuild?.banner?.js).toContain('var __DEV__=true');
    expect(config?.esbuild?.banner?.js).toContain('global.__DEV__=true');
    expect(config?.esbuild?.banner?.js).toContain('var self=global.self=global.self||global;');
    expect(config?.esbuild?.banner?.js).toContain('var window=global.window=global.window||global;');
    expect(config?.esbuild?.banner?.js).toContain('process.env.NODE_ENV="development"');
    expect(config?.esbuild).not.toHaveProperty('prelude');
  });

  it('keeps TossRN API Gateway requests on the development path', () => {
    const plugin = releaseProfiler({ enabled: true });
    const transformSync = (plugin.config as any)?.transformer?.transformSync;
    const httpCode = [
      'export function requestToAPIGateway<T = unknown>({ enableE2EEncryption = true, ...options }) {',
      '  if (__DEV__) {',
      '    return requestToAPIGatewayInPublic<T>(options);',
      '  }',
      '',
      '  if (!enableE2EEncryption) {',
      '    return requestToAPIGatewayInPublic<T>(options);',
      '  }',
      '',
      '  return requestToAPIGatewayInApp<T>(options, dword);',
      '}',
    ].join('\n');
    const rawRequestCode = [
      'async function requestAPIGateway(input, init) {',
      '  if (__DEV__ || !enableE2EEncryption) {',
      '    return fetchAPIGatewayResponse(options);',
      '  }',
      '',
      '  return requestToAPIGatewayInApp(options, dword);',
      '}',
    ].join('\n');

    const transformedHttpCode = transformSync(
      '/.yarn/cache/@tosscore-react-native.zip/node_modules/@tosscore/react-native/src/network/request/http.ts',
      httpCode
    );
    const transformedRawRequestCode = transformSync(
      '/.yarn/cache/@tosscore-react-native.zip/node_modules/@tosscore/react-native/src/network/request/rawRequest.ts',
      rawRequestCode
    );

    expect(transformedHttpCode).toContain('if (__DEV__)');
    expect(transformedHttpCode).toContain('return requestToAPIGatewayInPublic<T>(options);');
    expect(transformedRawRequestCode).toContain('if (__DEV__ || !enableE2EEncryption) {');
    expect(transformedRawRequestCode).toContain('return fetchAPIGatewayResponse(options);');
  });

  it('does not rewrite TossRN API Gateway origins', () => {
    const plugin = releaseProfiler({ enabled: true });
    const transformSync = (plugin.config as any)?.transformer?.transformSync;
    const originCode = [
      'function getAPIGatewayTossImOrigin() {',
      '  switch (getOperationalEnvironment()) {',
      "    case 'alpha':",
      "      return 'https://alpha-api-gateway.toss.im:21099';",
      '  }',
      '}',
      'function getAPIgatewayTossImOriginAU() {',
      '  switch (getOperationalEnvironment()) {',
      "    case 'alpha':",
      "      return 'https://alpha-api-gateway.au.toss.im';",
      '  }',
      '}',
      'function getAPIgatewayTossImOriginEU() {',
      '  switch (getOperationalEnvironment()) {',
      "    case 'alpha':",
      "      return 'https://alpha-api-gateway.eu.toss.im';",
      '  }',
      '}',
      'function getPayAPIGatewayTossImOrigin() {',
      '  switch (getOperationalEnvironment()) {',
      "    case 'alpha':",
      "      return 'https://alpha-payapi-gateway.toss.im:21099';",
      '  }',
      '}',
    ].join('\n');

    expect(
      transformSync(
        '/.yarn/cache/@tosscore-react-native.zip/node_modules/@tosscore/react-native/src/env/operational/origin.ts',
        originCode
      )
    ).toBe(originCode);
  });

  it('removes React Native networking type-only imports that create circular runtime imports', () => {
    const plugin = releaseProfiler({ enabled: true });
    const transformSync = (plugin.config as any)?.transformer?.transformSync;
    const code = [
      "import RCTDeviceEventEmitter from '../EventEmitter/RCTDeviceEventEmitter';",
      "import {type NativeResponseType} from './XMLHttpRequest';",
      'const RCTNetworking = {};',
    ].join('\n');

    expect(transformSync('/node_modules/react-native/Libraries/Network/RCTNetworking.ios.js', code)).toBe(
      ["import RCTDeviceEventEmitter from '../EventEmitter/RCTDeviceEventEmitter';", 'const RCTNetworking = {};'].join(
        '\n'
      )
    );
  });

  it('stays inactive by default', () => {
    expect(releaseProfiler().config).toBeUndefined();
  });
});
