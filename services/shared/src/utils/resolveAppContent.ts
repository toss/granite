import type { ComponentType } from 'react';
import { getGlobal } from './getGlobal';
import { waitForCondition } from './waitForCondition';
import { ErrorPage } from '../pages/ErrorPage';

export async function resolveAppContent(): Promise<ComponentType<unknown>> {
  const global = getGlobal();
  const isReady = () => global.Page != null;

  if (isReady()) {
    return global.Page!;
  } else {
    const Component = await waitForCondition('AppContent', isReady)
      .then(() => global.Page!)
      .catch((error) => {
        console.error('resolveAppContent', error);
        return ErrorPage;
      });

    return Component;
  }
}
