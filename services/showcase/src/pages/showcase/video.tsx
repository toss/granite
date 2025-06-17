import React, { useState } from 'react';
import { createRoute, Video, VisibilityProvider } from '@granite-js/react-native';
import { TextInput } from 'components/TextInput';
import { StyleSheet, View } from 'react-native';

export const Route = createRoute('/showcase/video', {
  validateParams: (params) => params,
  component: ShowcaseVideo,
});

function ShowcaseVideo() {
  const [url, setUrl] = useState('');

  return (
    // @FIXME: Sandbox app doesn't provide visibility state in the `initialProps`.
    <VisibilityProvider isVisible={true}>
      <View style={styles.textInputContainer}>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="Enter video URL"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <Video muted style={styles.videoContainer} source={{ uri: url }} />
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
