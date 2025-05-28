import { render, renderHook, screen } from '@testing-library/react-native';
import { useRef } from 'react';
import { View } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { flex, Flex } from './flex';

describe('Flex', () => {
  it(`Flex is rendered as <View />`, () => {
    const treeJSON = render(<Flex />).toJSON() as ReactTestRendererJSON;
    expect(treeJSON.type).toBe('View');
  });

  it('Flex.Center applies align="center" justify="center"', () => {
    render(<Flex.Center testID="flex" />);
    expect(screen.getByTestId('flex')).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
    });
  });

  it('Flex.CenterVertical applies justify="center"', () => {
    render(<Flex.CenterVertical testID="flex" />);
    expect(screen.getByTestId('flex')).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'stretch',
      flexDirection: 'column',
    });
  });

  it('Flex.CenterHorizontal applies justyfyContent="center"', () => {
    render(<Flex.CenterHorizontal testID="flex" />);
    expect(screen.getByTestId('flex')).toHaveStyle({
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
      flexDirection: 'column',
    });
  });

  describe('ref', () => {
    it(`Flex should be able to receive ref`, () => {
      const {
        result: { current: ref },
      } = renderHook(() => useRef<View>(null));

      render(<Flex ref={ref} />);

      expect(ref.current).not.toBeNull();
    });
  });
});

describe('flex', () => {
  it(`when passing an empty object to flex, it returns defaultProps with display="flex" direction="column" justify="flex-start" align="stretch"`, () => {
    const result = flex({});
    expect(result).toMatchInlineSnapshot(`
      {
        "alignItems": "stretch",
        "display": "flex",
        "flexDirection": "column",
        "justifyContent": "flex-start",
      }
    `);
  });

  it(`when passing string to flex, it returns with align, justify, direction applied`, () => {
    const result = flex('flex-start', 'center', 'row');
    expect(result).toMatchInlineSnapshot(`
      {
        "alignItems": "flex-start",
        "display": "flex",
        "flexDirection": "row",
        "justifyContent": "center",
      }
    `);
  });

  it('flex.center() returns with justyfy="center" align="center"', () => {
    const result = flex.center();
    expect(result).toMatchInlineSnapshot(`
      {
        "alignItems": "center",
        "display": "flex",
        "flexDirection": "column",
        "justifyContent": "center",
      }
    `);
  });
});
