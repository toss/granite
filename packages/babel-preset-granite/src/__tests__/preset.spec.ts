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
      expect(result).toMatchInlineSnapshot(`"var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");var _classCallCheck2=_interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));var _createClass2=_interopRequireDefault(require("@babel/runtime/helpers/createClass"));var _possibleConstructorReturn2=_interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));var _getPrototypeOf2=_interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));var _inherits2=_interopRequireDefault(require("@babel/runtime/helpers/inherits"));function _callSuper(t,o,e){return o=(0,_getPrototypeOf2.default)(o),(0,_possibleConstructorReturn2.default)(t,_isNativeReflectConstruct()?Reflect.construct(o,e||[],(0,_getPrototypeOf2.default)(t).constructor):o.apply(t,e));}function _isNativeReflectConstruct(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}));}catch(t){}return(_isNativeReflectConstruct=function(){return!!t;})();}var FlatList=function(_React$PureComponent){function FlatList(props){var _this;(0,_classCallCheck2.default)(this,FlatList);_this=_callSuper(this,FlatList,[props]);_this._checkProps(_this.props);return _this;}(0,_inherits2.default)(FlatList,_React$PureComponent);return(0,_createClass2.default)(FlatList,[{key:"_checkProps",value:function _checkProps(props){var getItem=props.getItem;}}]);}(React.PureComponent);"`);
    });
  });
});
