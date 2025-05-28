import type { PluginBuild } from 'esbuild';
import { Performance } from '../../../performance';
import type { ProtocolConfig } from '../../../types';

export function setupProtocolResolver(build: PluginBuild, protocolConfig: ProtocolConfig) {
  const protocols = Object.entries(protocolConfig);

  protocols.forEach(([protocol, { resolve, load }]) => {
    // 모듈 경로가 'protocol:' 형태인 경우만 필터링하기 위한 정규표현식
    const protocolRegExp = new RegExp(`^${protocol}:`);

    build.onResolve({ filter: protocolRegExp }, async (args) => {
      const trace = Performance.trace('protocol-resolver', {
        detail: {
          pattern: protocolRegExp,
          path: args.path,
        },
      });
      const path = typeof resolve === 'function' ? await resolve(args) : args.path.replace(protocolRegExp, '');
      trace.stop();

      return {
        // 'protocol:foo' -> 'foo'
        path,
        namespace: getProtocolNamespace(protocol),
      };
    });

    build.onLoad({ filter: /.*/, namespace: getProtocolNamespace(protocol) }, (args) => load(args));
  });
}

function getProtocolNamespace(protocol: string): `protocol-${string}` {
  return `protocol-${protocol}`;
}
