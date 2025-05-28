/** @type {import('@yarnpkg/types')} */
const { REACT_NATIVE_RUNTIME_VERSION } = require('./shared/runtime');
const { defineConfig } = require('@yarnpkg/types');

const defaultMinimumPeerDependencyVersion = {};

function uniq(arr) {
  return [...new Set(arr)];
}

const cache = new Map();

function getPeerDependenciesOfPackage(pkgName, { Yarn }) {
  const workspace = Yarn.workspace({ ident: pkgName });

  if (!workspace) {
    return [];
  }

  if (cache.has(pkgName)) {
    return cache.get(pkgName);
  }

  const manifest = workspace.manifest;

  const peerDependencies = Object.keys(manifest.peerDependencies ?? {});

  const peerDependenciesOfDependencies = Object.keys(manifest.dependencies ?? {})
    .map((dependency) => getPeerDependenciesOfPackage(dependency, { Yarn }))
    .flat();

  const result = uniq([
    ...peerDependencies,
    ...peerDependenciesOfDependencies.filter((dep) => !manifest.dependencies?.[dep]),
  ]);

  cache.set(pkgName, result);

  return result;
}

module.exports = defineConfig({
  async constraints({ Yarn }) {
    for (const dep of Yarn.dependencies({ ident: '@types/node' })) {
      dep.update('^22.10.2');
    }

    for (const dep of Yarn.dependencies({ ident: 'react-native' })) {
      if (dep.type === 'dependencies' || dep.type === 'devDependencies') {
        dep.update(REACT_NATIVE_RUNTIME_VERSION);
      }
    }

    for (const workspace of Yarn.workspaces()) {
      const name = workspace.ident;

      if (workspace.manifest.private) {
        continue;
      }

      const requiredPeerDependencies = getPeerDependenciesOfPackage(name, { Yarn });

      if (requiredPeerDependencies.length === 0) {
        continue;
      }

      for (const peerDependency of requiredPeerDependencies) {
        const existingVersion = workspace.manifest.peerDependencies?.[peerDependency];
        const requiredVersion = existingVersion ?? defaultMinimumPeerDependencyVersion[peerDependency] ?? '*';

        workspace.set(`peerDependencies[${JSON.stringify(peerDependency)}]`, requiredVersion);
      }
    }
  },
});
