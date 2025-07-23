export function getContainer(instanceName: string) {
  const containerIndex = __MICRO_FRONTEND__.__INSTANCES__[instanceName];

  return typeof containerIndex === 'number' ? __MICRO_FRONTEND__.__INSTANCES__[containerIndex]! : null;
}

export function normalizePath(path: string) {
  if (path.startsWith('./')) {
    return path.slice(2);
  }

  return path;
}

export function parseRemotePath(remotePath: string) {
  const [remoteName, ...rest] = remotePath.split('/');

  if (remoteName && rest.length > 0) {
    return {
      remoteName,
      modulePath: rest.join('/'),
      fullRequest: remotePath,
    };
  }

  throw new Error(`Invalid remote request: ${remotePath}`);
}

export function importRemoteModule(remoteRequestPath: string) {
  const { remoteName, modulePath } = parseRemotePath(remoteRequestPath);
  const container = getContainer(remoteName);

  if (container == null) {
    throw new Error(`${remoteName} container not found`);
  }

  const module = container.exposeMap[normalizePath(modulePath)];
  if (module == null) {
    throw new Error(`Could not resolve '${modulePath}' in ${remoteName} container`);
  }

  return module;
}
