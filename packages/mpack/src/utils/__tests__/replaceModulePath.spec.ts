import { describe, expect, it } from 'vitest';
import { replaceModulePath } from '../replaceModulePath';

describe('replaceModulePath', () => {
  const from = 'react-native';
  const to = 'react-native-0.68.2';

  it('모듈 경로가 지정한 모듈로 치환되어야 한다', () => {
    const path = 'react-native';

    expect(replaceModulePath(path, from, to)).toEqual('react-native-0.68.2');
  });

  describe('모듈 경로에 subpath 가 존재하는 경우', () => {
    const path = 'react-native/Libraries/Core/InitializeCore.js';

    it('subpath 가 포함된 상태로 치환되어야 한다', () => {
      expect(replaceModulePath(path, from, to)).toEqual('react-native-0.68.2/Libraries/Core/InitializeCore.js');
    });
  });
});
