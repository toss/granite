import type { ProtocolConfig } from '@granite-js/plugin-core';
import type { PluginBuild } from 'esbuild';
import { Performance } from '../../../../performance';

export function setupProtocolResolver(build: PluginBuild, protocolConfig: ProtocolConfig) {
  const protocols = Object.entries(protocolConfig);

  protocols.forEach(([protocol, { resolve, load }]) => {
    // Regexp to filter only module paths that start with 'protocol:'
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
