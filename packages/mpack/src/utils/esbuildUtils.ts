import os from 'os';

interface EsbuildUtils {
  /**
   * - Posix: 입력받은 경로 그대로 반환
   * - Windows: `\\` 부분을 posix 스타일인 `/` 로 일괄 치환한 뒤 반환
   *   - esbuild 플러그인을 통해 임의의 코드를 주입할 때, Window style path가 제대로 파싱되지 않는 버그가 있음.
   *   ```js
   *   // eg. 임의로 코드를 주입할 때, 경로 파싱 이슈가 생기는 케이스
   *   build.onLoad(..., () => {
   *     return {
   *       contents: [
   *         // onResolve 훅에서 path 가 잘못 파싱됨
   *         `import 'C:\\foo\\bar\\bar.js';`,
   *         originCode
   *       ].join('\n'),
   *     };
   *   });
   *   ```
   */
  normalizePath: (path: string) => string;
}

const win32Impl: EsbuildUtils = {
  normalizePath: (path: string) => path.replace(/\\/g, '/'),
};

const posixImpl: EsbuildUtils = {
  normalizePath: (path: string) => path,
};

export const { normalizePath } = os.type() === 'Windows_NT' ? win32Impl : posixImpl;
