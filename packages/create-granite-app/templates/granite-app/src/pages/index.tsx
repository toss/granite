import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();

  const goToAboutPage = () => {
    navigation.navigate('/about');
  };

  return (
    <Container>
      <Text style={styles.title}>🎉 Welcome! 🎉</Text>
      <Text style={styles.subtitle}>
        This is a demo page for the <Text style={styles.brandText}>Granite</Text> Framework.
      </Text>
      <Text style={styles.description}>This page was created to showcase the features of the Granite.</Text>
      <TouchableOpacity style={styles.button} onPress={goToAboutPage}>
        <Text style={styles.buttonText}>Go to About Page</Text>
      </TouchableOpacity>
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return <View style={styles.container}>{children}</View>;
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
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  codeContainer: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    width: '100%',
  },
  code: {
    color: 'white',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    fontSize: 14,
  },
});
