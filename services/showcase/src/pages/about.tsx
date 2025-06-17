import { createRoute, Stack } from '@granite-js/react-native';
import { StyleSheet, Text } from 'react-native';
import { Button } from 'components/Button';

export const Route = createRoute('/about', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();

  const handleGoShowcase = () => {
    navigation.navigate('/showcase');
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <Stack.Vertical style={styles.container} gutter={16}>
      <Text style={styles.title}>About Granite</Text>
      <Text style={styles.description}>Granite is a powerful and flexible React Native Framework 🚀</Text>
      <Button label="Show more" onPress={handleGoShowcase} />
      <Button label="Go Back" appearance="text" onPress={handleGoBack} />
    </Stack.Vertical>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  buttonBase: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#0064FF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textButtonLabel: {
    color: '#777',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
