import { getContainer } from '@granite-js/micro-frontend/runtime';
import type { InitialProps } from '@granite-js/react-native';
import type { ComponentType } from 'react';
import { waitForCondition } from './waitForCondition';

interface AppModule {
  readonly default?: ComponentType<InitialProps>;
}

export async function resolveAppContent(remotePath: string): Promise<ComponentType<InitialProps>> {
  const separatorIndex = remotePath.indexOf('/');
  if (separatorIndex <= 0 || separatorIndex === remotePath.length - 1) {
    throw new Error(`Invalid remote app request: ${remotePath}`);
  }
  const appName = remotePath.slice(0, separatorIndex);
  const exposedModule = `./${remotePath.slice(separatorIndex + 1)}`;

  const isRemoteReady = () => {
    return getContainer(appName) != null;
  };

  const getAppComponent = () => {
    const module = getContainer(appName)?.exposedModules[exposedModule] as AppModule | undefined;
    if (module?.default == null) {
      throw new Error(`Remote app module is unavailable: ${remotePath}`);
    }
    return module.default;
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
