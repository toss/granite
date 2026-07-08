import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  getHostSkeletonStoreVersion,
  getIsHostSkeletonHidden,
  resetHostSkeleton,
  resolveHostSkeleton,
  subscribeHostSkeletonStore,
} from './hostSkeletonStore';

export interface HostSkeletonProps {
  url: string | null | undefined;
}

export interface HostSkeletonController {
  url: string | null;
  isPresent: boolean;
  isHidden: boolean;
  present: (url: string | null) => void;
  dismiss: () => void;
}

export function useIsHostSkeletonHidden() {
  return useSyncExternalStore(subscribeHostSkeletonStore, getIsHostSkeletonHidden, getIsHostSkeletonHidden);
}

function useHostSkeletonStoreVersion() {
  return useSyncExternalStore(subscribeHostSkeletonStore, getHostSkeletonStoreVersion, getHostSkeletonStoreVersion);
}

export function useResolvedHostSkeleton(url: string | null | undefined) {
  const version = useHostSkeletonStoreVersion();

  return useMemo(() => {
    if (url == null) {
      return null;
    }

    return resolveHostSkeleton(url);
  }, [url, version]);
}

export function HostSkeleton({ url }: HostSkeletonProps) {
  const resolvedSkeleton = useResolvedHostSkeleton(url);

  if (resolvedSkeleton == null) {
    return null;
  }

  const SkeletonComponent = resolvedSkeleton.component;

  return (
    <View pointerEvents="none" style={styles.root}>
      <SkeletonComponent {...resolvedSkeleton.params} />
    </View>
  );
}

export function useHostSkeletonController(): HostSkeletonController {
  const [url, setUrl] = useState<string | null>(null);
  const [isPresent, setIsPresent] = useState(false);
  const isHidden = useIsHostSkeletonHidden();

  const present = useCallback((nextUrl: string | null) => {
    setIsPresent(wasPresent => {
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

  return {
    url,
    isPresent,
    isHidden,
    present,
    dismiss,
  };
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
