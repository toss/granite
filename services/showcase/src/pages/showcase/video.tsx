import { createRoute, Video, VisibilityProvider, Stack } from '@granite-js/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { TextInput } from '../../components/TextInput';

export const Route = createRoute('/showcase/video', {
  validateParams: (params) => params,
  component: ShowcaseVideo,
});

function ShowcaseVideo() {
  const [url, setUrl] = useState('');
  const [load, setLoad] = useState(false);

  return (
    // @FIXME: Sandbox app doesn't provide visibility state in the `initialProps`.
    <VisibilityProvider isVisible={true}>
      <Stack.Vertical style={styles.textInputContainer} gutter={16}>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="Enter video URL"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button label="Load" onPress={() => setLoad(Boolean(url))} />
      </Stack.Vertical>
      {url && load ? <Video muted style={styles.videoContainer} source={{ uri: url }} /> : null}
    </VisibilityProvider>
  );
}

const styles = StyleSheet.create({
  textInputContainer: {
    padding: 16,
    marginBottom: 16,
  },
  videoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#eee',
  },
});
