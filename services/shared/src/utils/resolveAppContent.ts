import { getContainer, parseRemotePath, importRemoteModule } from '@granite-js/plugin-micro-frontend/runtime';
import type { ComponentType } from 'react';
import { waitForCondition } from './waitForCondition';

export async function resolveAppContent(remotePath: string): Promise<ComponentType<unknown>> {
  const { remoteName } = parseRemotePath(remotePath);

  const isRemoteReady = () => {
    return Boolean(getContainer(remoteName));
  };

  const getAppComponent = () => {
    const module = importRemoteModule(remotePath);
    return module?.default || module;
  };

  if (isRemoteReady()) {
    return getAppComponent();
  } else {
    const Component = await waitForCondition('AppContent', isRemoteReady)
      .then(() => getAppComponent())
      .catch((error) => {
        console.error('resolveAppContent', error);
        throw error;
      });

    return Component;
  }
}
