import { createRoute, Stack } from '@granite-js/react-native';
import { useState } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const [scheme, setScheme] = useState('granite://bare');
  const [schemeError, setSchemeError] = useState<string | null>(null);

  const goToAboutPage = () => {
    navigation.navigate('/about');
  };

  const openScheme = () => {
    const url = scheme.trim();

    if (url.length === 0) {
      setSchemeError('Enter a URL scheme to open.');
      return;
    }

    setSchemeError(null);
    void Linking.openURL(url).catch((error: unknown) => {
      setSchemeError(error instanceof Error ? error.message : 'Unable to open the URL scheme.');
    });
  };

  return (
    <Stack.Vertical style={styles.container} gutter={16}>
      <Text style={styles.title}>🎉 Welcome! 🎉</Text>
      <Text style={styles.subtitle}>
        This is a demo page for the <Text style={styles.brandText}>Granite</Text> Framework.
      </Text>
      <Text style={styles.description}>This page was created to showcase the features of the Granite.</Text>
      <Button label="Go to About Page" onPress={goToAboutPage} />
      <Stack.Vertical style={styles.schemeTester} gutter={12}>
        <Text style={styles.schemeTesterTitle}>Open a URL scheme</Text>
        <Text style={styles.schemeTesterDescription}>Enter a scheme to test native linking from this service.</Text>
        <TextInput
          accessibilityLabel="URL scheme"
          value={scheme}
          onChangeText={setScheme}
          onSubmitEditing={openScheme}
          placeholder="granite://showcase/about"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
        />
        <Button label="Open Scheme" onPress={openScheme} />
        {schemeError == null ? null : (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {schemeError}
          </Text>
        )}
      </Stack.Vertical>
    </Stack.Vertical>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    color: '#0064FF',
    fontWeight: 'bold',
  },
  text: {
    fontSize: 24,
    color: '#202632',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#4A5568',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  schemeTester: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: 480,
    marginTop: 16,
  },
  schemeTesterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  schemeTesterDescription: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#C53030',
  },
});
