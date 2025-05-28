import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { Children } from './children';
import { Spacing } from './spacing';

describe('Children', () => {
  describe('Gap', () => {
    function Spacing16() {
      return <Spacing size={16} />;
    }

    it(`Children.Gap renders with gap components added between child elements`, () => {
      const childCount = 5;
      const children = new Array(childCount).fill(null).map((_, index) => <View key={index} />);
      const treeJSON = render(
        <Children.Gap gap={<Spacing16 />}>{children}</Children.Gap>
      ).toJSON() as ReactTestRendererJSON[];

      // Number of children + number of gaps between children
      expect(treeJSON.length).toBe(childCount + childCount - 1);
    });
  });
});
