import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders the label and calls onPress when pressed', () => {
    const onPress = vi.fn();
    render(<Button label="Go to About Page" onPress={onPress} />);

    const label = screen.getByText('Go to About Page');

    expect(label).toBeTruthy();
    fireEvent.press(label);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
