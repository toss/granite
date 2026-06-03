import { render, screen } from '@testing-library/react-native';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ShowcaseScreen } from '../src/ShowcaseScreen';

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('App', () => {
  it('renders the showcase screen', () => {
    render(<ShowcaseScreen />);

    expect(screen.getByText('Granite Greenfield')).toBeTruthy();
    expect(screen.getByText('@granite-js/video')).toBeTruthy();
  });
});
