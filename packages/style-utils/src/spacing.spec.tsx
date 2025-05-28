import { render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { Spacing } from './spacing';

describe('Spacing', () => {
  it('Spacing is rendered as <View />', () => {
    const rendererJSON = render(<Spacing size={8} />).toJSON() as ReactTestRendererJSON;
    expect(rendererJSON.type).toBe('View');
  });

  it('When Spacing is vertical, it is rendered with "height" props', () => {
    render(<Spacing size={8} testID="spacing" />);
    expect(screen.getByTestId('spacing')).toHaveStyle({
      height: 8,
    });
  });

  it('When Spacing is horizontal, it is rendered with "width" props', () => {
    render(<Spacing size={8} direction="horizontal" testID="spacing" />);
    expect(screen.getByTestId('spacing')).toHaveStyle({
      width: 8,
    });
  });
});
