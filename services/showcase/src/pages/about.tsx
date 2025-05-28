import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export const Route = createRoute('/about', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>About Granite</Text>
      <Text style={styles.description}>Granite is a powerful and flexible React Native Framework 🚀</Text>
      <TouchableOpacity style={styles.button} onPress={handleGoBack}>
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
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
  button: {
    marginTop: 24,
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
});
