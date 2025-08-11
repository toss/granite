import { createRoute, useBackEvent } from '@granite-js/react-native';
import { useCallback } from 'react';
import { Alert, Button } from 'react-native';

export const Route = createRoute('/showcase/use-back-event', {
  validateParams: (params) => params,
  component: UseBackEvent,
});

function UseBackEvent() {
  const backEvent = useBackEvent();

  const backHandler = useCallback(() => {
    Alert.alert('back pressed!');
  }, []);

  return (
    <>
      <Button
        title="Add BackEvent Callback"
        onPress={() => {
          backEvent.addEventListener(backHandler);
        }}
      />

      <Button
        title="Remove BackEvent Callback"
        onPress={() => {
          backEvent.removeEventListener(backHandler);
        }}
      />
    </>
  );
}
