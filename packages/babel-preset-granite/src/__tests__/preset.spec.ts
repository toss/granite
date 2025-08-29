import { transformSync } from '@babel/core';
import { describe, it, expect } from 'vitest';
import preset from '../index.js';

describe('babel-preset-granite', () => {
  const transformCode = (code: string) => {
    return transformSync(code, {
      presets: [preset],
      filename: 'test.tsx',
    })?.code;
  };

  describe('plugin ordering', () => {
    it('should apply flow-strip-types plugin first', () => {
      const input = `
        // Flow
        class FlatList extends React.PureComponent<Props, State> {
          props: Props; 
          state: State; 
          constructor(props) {
            super(props);
            this._checkProps(this.props);
          }
          _checkProps(props) {
            const { getItem } = props;
          }
        }
      `;

      const result = transformCode(input);
      expect(result).toMatchInlineSnapshot(`
        ""use strict";

        // Flow
        class FlatList extends React.PureComponent {
          constructor(props) {
            super(props);
            this._checkProps(this.props);
          }
          _checkProps(props) {
            const {
              getItem
            } = props;
          }
        }"
      `);
    });
  });
});
