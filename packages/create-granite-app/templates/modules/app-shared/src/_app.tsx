import {
  getContainer,
  importRemoteModule,
  parseRemotePath,
} from '@granite-js/plugin-micro-frontend/runtime';
import { Granite, type InitialProps } from '@granite-js/react-native';
import { BrickModule } from 'brick-module';
import React, { Suspense, type ComponentType } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type GraniteGlobal = typeof globalThis & {
  __mpackInternal?: {
    loadRemote: () => Promise<void>;
  };
};

async function loadRemoteApp(
  remotePath: string,
): Promise<{ default: ComponentType<InitialProps> }> {
  const global = globalThis as GraniteGlobal;

  const bundleLoadTask =
    global.__mpackInternal?.loadRemote() ??
    BrickModule.get<{
      moduleName: 'TossBundleLoader';
      importLazy: () => Promise<void>;
    }>('TossBundleLoader').importLazy();

  await bundleLoadTask;

  const { remoteName } = parseRemotePath(remotePath);
  if (getContainer(remoteName) == null) {
    throw new Error(`${remoteName} container not found`);
  }

  const module = importRemoteModule(remotePath);
  return { default: module.default ?? module };
}

const AppContent = React.lazy(() => loadRemoteApp('remoteApp/AppContainer'));

function AppContainer(props: InitialProps) {
  return (
    <SafeAreaProvider>
      <Suspense fallback={null}>
        <AppContent {...props} />
      </Suspense>
    </SafeAreaProvider>
  );
}

export default Granite.registerHostApp(AppContainer, { appName: 'shared' });
