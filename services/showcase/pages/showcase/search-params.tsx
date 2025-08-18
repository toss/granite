import { createRoute, useInitialSearchParams } from '@granite-js/react-native';
import { Text, View } from 'react-native';

export const Route = createRoute('/showcase/search-params', {
  validateParams: (params) => params,
  component: ShowcaseSearchParams,
});

function ShowcaseSearchParams() {
  const searchParams = useInitialSearchParams();

  return (
    <View>
      <Text>{JSON.stringify(searchParams, undefined, 2)}</Text>
    </View>
  );
}
