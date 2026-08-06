import { useCallback, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  getHostSkeletonStoreVersion,
  getIsHostSkeletonHidden,
  resetHostSkeleton,
  resolveHostSkeleton,
  resolveHostSkeletonForAppUrl,
  subscribeHostSkeletonStore,
} from './hostSkeletonStore';

export interface HostSkeletonProps {
  readonly url: string | null | undefined;
  readonly appName?: string | null;
}

export interface HostSkeletonController {
  readonly url: string | null;
  readonly isPresent: boolean;
  readonly isHidden: boolean;
  readonly present: (url: string | null) => void;
  readonly dismiss: () => void;
}

export function useIsHostSkeletonHidden() {
  return useSyncExternalStore(subscribeHostSkeletonStore, getIsHostSkeletonHidden, getIsHostSkeletonHidden);
}

function useHostSkeletonStoreVersion() {
  return useSyncExternalStore(subscribeHostSkeletonStore, getHostSkeletonStoreVersion, getHostSkeletonStoreVersion);
}

export function useResolvedHostSkeleton(url: string | null | undefined, appName?: string | null) {
  useHostSkeletonStoreVersion();

  if (url == null) {
    return null;
  }

  return appName == null ? resolveHostSkeleton(url) : resolveHostSkeletonForAppUrl(appName, url);
}

export function HostSkeleton({ url, appName }: HostSkeletonProps) {
  const resolvedSkeleton = useResolvedHostSkeleton(url, appName);
  const isHidden = useIsHostSkeletonHidden();

  if (resolvedSkeleton == null || isHidden) {
    return null;
  }

  const SkeletonComponent = resolvedSkeleton.component;

  return (
    <View
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.root}
    >
      <SkeletonComponent {...resolvedSkeleton.params} />
    </View>
  );
}

export function useHostSkeletonController(): HostSkeletonController {
  const [url, setUrl] = useState<string | null>(null);
  const [isPresent, setIsPresent] = useState(false);
  const isHidden = useIsHostSkeletonHidden();

  const present = useCallback((nextUrl: string | null) => {
    setIsPresent((wasPresent) => {
      if (wasPresent) {
        resetHostSkeleton();
      }

      return true;
    });
    setUrl(nextUrl);
  }, []);

  const dismiss = useCallback(() => {
    resetHostSkeleton();
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
