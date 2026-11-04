import { Router as StandaloneRouter, type RouterProps } from '@granite-js/router';
import { Platform } from 'react-native';
import { useOptionalIsAppForeground } from '../visibility/useIsAppForeground';
import { useOptionalVisibilityChanged } from '../visibility/useVisibilityChanged';

/** Connects host visibility to the standalone router without coupling registration to navigation. */
export function Router({ isActive, ...props }: RouterProps) {
  const visible = useOptionalVisibilityChanged();
  const foreground = useOptionalIsAppForeground();
  const hostActive = visible === undefined ? undefined : visible && (Platform.OS === 'android' || foreground !== false);
  return (
    <StandaloneRouter {...props} isActive={hostActive === undefined ? isActive : hostActive && (isActive ?? true)} />
  );
}
