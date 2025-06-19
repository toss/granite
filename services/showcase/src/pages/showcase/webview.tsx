import { WebView } from '@granite-js/native/react-native-webview';
import { createRoute } from '@granite-js/react-native';
import { View } from 'react-native';

export const Route = createRoute('/showcase/webview', {
  validateParams: (params) => params,
  component: ShowcaseWebview,
});

function ShowcaseWebview() {
  return (
    <View style={{ flex: 1 }}>
      <WebView style={{ flex: 1, backgroundColor: '#ddd' }} source={{ uri: 'https://granite.run' }} />
    </View>
  );
}
