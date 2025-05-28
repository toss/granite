import { NavigationContainerRefWithCurrent } from '@granite-js/native/@react-navigation/native';
import { BackButton } from './BackButton';
import { closeView } from '../../native-modules';

export type RouterBackButtonProps = {
  onPress?: () => void;
  tintColor?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  navigationContainerRef: NavigationContainerRefWithCurrent<any>;
};

export function RouterBackButton({ tintColor, canGoBack, onBack, navigationContainerRef }: RouterBackButtonProps) {
  return (
    <BackButton
      tintColor={tintColor}
      onPress={() => {
        onBack?.();

        if (!canGoBack) {
          return;
        }

        if (navigationContainerRef.canGoBack()) {
          navigationContainerRef.goBack();
        } else {
          closeView();
        }
      }}
    />
  );
}
