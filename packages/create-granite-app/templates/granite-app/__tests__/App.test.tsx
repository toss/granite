import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

function Greeting({ onPress }: { onPress: () => void }) {
  return (
    <View>
      <Text>🎉 Welcome! 🎉</Text>
      <TouchableOpacity onPress={onPress}>
        <Text>Go to About Page</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('App', () => {
  it('renders and handles a press', () => {
    const onPress = vi.fn();
    render(<Greeting onPress={onPress} />);

    expect(screen.getByText('🎉 Welcome! 🎉')).toBeTruthy();

    fireEvent.press(screen.getByText('Go to About Page'));
    expect(onPress).toHaveBeenCalled();
  });
});
