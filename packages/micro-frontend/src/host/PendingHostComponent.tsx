import { useCallback, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  getPendingHostComponentStoreVersion,
  getIsPendingHostComponentHidden,
  resetPendingHostComponent,
  resolvePendingHostComponent,
  subscribePendingHostComponentStore,
} from './pendingHostComponentStore';

export interface PendingHostComponentProps {
  readonly url: string | null | undefined;
}

export interface PendingHostComponentController {
  readonly url: string | null;
  readonly isPresent: boolean;
  readonly isHidden: boolean;
  readonly present: (url: string | null) => void;
  readonly dismiss: () => void;
}

export function useIsPendingHostComponentHidden() {
  return useSyncExternalStore(subscribePendingHostComponentStore, getIsPendingHostComponentHidden, getIsPendingHostComponentHidden);
}

function usePendingHostComponentStoreVersion() {
  return useSyncExternalStore(subscribePendingHostComponentStore, getPendingHostComponentStoreVersion, getPendingHostComponentStoreVersion);
}

export function useResolvedPendingHostComponent(url: string | null | undefined) {
  usePendingHostComponentStoreVersion();

  if (url == null) {
    return null;
  }

  return resolvePendingHostComponent(url);
}

export function PendingHostComponent({ url }: PendingHostComponentProps) {
  const resolvedPendingHostComponent = useResolvedPendingHostComponent(url);
  const isHidden = useIsPendingHostComponentHidden();

  if (resolvedPendingHostComponent == null || isHidden) {
    return null;
  }

  const Component = resolvedPendingHostComponent.component;

  return (
    <View
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.root}
    >
      <Component {...resolvedPendingHostComponent.params} />
    </View>
  );
}

export function usePendingHostComponentController(): PendingHostComponentController {
  const [url, setUrl] = useState<string | null>(null);
  const [isPresent, setIsPresent] = useState(false);
  const isHidden = useIsPendingHostComponentHidden();

  const present = useCallback((nextUrl: string | null) => {
    setIsPresent((wasPresent) => {
      if (wasPresent) {
        resetPendingHostComponent();
      }

      return true;
    });
    setUrl(nextUrl);
  }, []);

  const dismiss = useCallback(() => {
    resetPendingHostComponent();
    setUrl(null);
    setIsPresent(false);
  }, []);

  return { url, isPresent, isHidden, present, dismiss };
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
});
