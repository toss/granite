import { createRoute, Image } from '@granite-js/react-native';
import { View } from 'react-native';

export const Route = createRoute('/showcase/image', {
  validateParams: (params) => params,
  component: ShowcaseImage,
});

function ShowcaseImage() {
  return (
    <View>
      <Image
        style={{ width: 100, height: 100 }}
        source={{ uri: 'https://picsum.photos/200' }}
        onLoadEnd={() => console.log('Image onLoadEnd')}
        onError={() => console.log('Image onError')}
      />
      <Image
        style={{ width: 100, height: 100 }}
        source={{ uri: 'https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/helloworld.svg' }}
        onLoadEnd={() => console.log('SvgImage onLoadEnd')}
        onError={() => console.log('SvgImage onError')}
      />
    </View>
  );
}
