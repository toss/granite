import { Text, View } from 'react-native';
import { createRoute, useInitialProps } from '@granite-js/react-native';

export const Route = createRoute('/showcase/initial-props', {
  validateParams: (params) => params,
  component: ShowcaseInitialProps,
});

function ShowcaseInitialProps() {
  const initialProps = useInitialProps();

  return (
    <View>
      <Text>{JSON.stringify(initialProps, undefined, 2)}</Text>
    </View>
  );
}
