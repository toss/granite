import path from 'path';
import type { MicroFrontendPluginOptions } from './types';

export function getPreludeConfig(options: MicroFrontendPluginOptions) {
  const sharedEntries = Object.entries(options.shared ?? {});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const eagerEntries = sharedEntries.filter(([_, config]) => config.eager === true);

  const registerStatements = eagerEntries.map(([libName], index) => {
    const identifier = `__mod${index}`;
    // View config registration is a one-shot host-wide side effect, but
    // scoped services re-run their module graphs per mount — tolerate the
    // duplicate instead of letting the invariant kill the render.
    const registeredModule =
      libName === 'react-native/Libraries/NativeComponent/NativeComponentRegistry'
        ? `toDuplicateTolerantNativeComponentRegistry(${identifier})`
        : identifier;

    return `
    // ${libName}
    import * as ${identifier} from '${libName}';
    registerShared('${libName}', ${registeredModule});
    `;
  });

  const exposeStatements = Object.entries(options.exposes ?? {}).map(([exposeName, modulePath], index) => {
    const identifier = `__expose${index}`;
    const resolvedModulePath = path.resolve(modulePath);

    return `
    import * as ${identifier} from '${resolvedModulePath}';
    exposeModule(__container, '${exposeName}', ${identifier});
    `;
  });

  const preludeScript = [
    `import { registerShared, createContainer, exposeModule, toDuplicateTolerantNativeComponentRegistry } from '@granite-js/plugin-micro-frontend/runtime';`,
    `const __container = createContainer('${options.name}', ${JSON.stringify({ remote: options.remote, shared: options.shared })});`,
    ...registerStatements,
    ...exposeStatements,
  ].join('\n');

  return {
    preludeScript,
  };
}
