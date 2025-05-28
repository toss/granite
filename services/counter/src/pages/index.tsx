import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';

export const Route = createRoute('/', {
  component: CounterPage,
});

function CounterPage() {
  const [count, setCount] = useState(0);

  const increment = () => setCount((prevCount) => prevCount + 1);
  const decrement = () => setCount((prevCount) => prevCount - 1);
  const reset = () => setCount(0);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Counter</Text>
        <Text style={styles.countText}>{count}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.decrementButton]} onPress={decrement}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.incrementButton]} onPress={increment}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={reset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    width: screenWidth * 0.85,
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 24,
  },
  countText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#0064FF',
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 24,
    gap: 20,
  },
  button: {
    borderRadius: 50,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  incrementButton: {
    backgroundColor: '#0064FF',
  },
  decrementButton: {
    backgroundColor: '#FF5A5F',
  },
  buttonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#718096',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: 'auto',
    height: 'auto',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
