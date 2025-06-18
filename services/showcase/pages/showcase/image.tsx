import { Image, View } from 'react-native';
import { createRoute, SvgImage } from '@granite-js/react-native';

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
      <SvgImage
        style={{ width: 100, height: 100 }}
        url="https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/helloworld.svg"
        onLoadEnd={() => console.log('SvgImage onLoadEnd')}
        onError={() => console.log('SvgImage onError')}
      />
    </View>
  );
}
