import { render } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { Stack } from './stack';

describe('Stack', () => {
  it('Default Stack is rendered in vertical direction', () => {
    const rendererJSON = render(<Stack gutter={16} />).toJSON() as ReactTestRendererJSON;

    expect(rendererJSON.props.style[0]).toEqual(
      expect.objectContaining({
        flexDirection: 'column',
      })
    );
  });

  describe('Stack.Vertical', () => {
    it('Stack.Vertical is rendered in vertical direction', () => {
      const rendererJSON = render(<Stack.Vertical gutter={16} />).toJSON() as ReactTestRendererJSON;

      expect(rendererJSON.props.style[0]).toEqual(
        expect.objectContaining({
          flexDirection: 'column',
        })
      );
    });
  });

  describe('Stack.Horizontal', () => {
    it('Stack.Horizontal is rendered in horizontal direction', () => {
      const rendererJSON = render(<Stack.Horizontal gutter={16} />).toJSON() as ReactTestRendererJSON;

      expect(rendererJSON.props.style[0]).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
        })
      );
    });
  });
});
