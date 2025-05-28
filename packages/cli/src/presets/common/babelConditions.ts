export const babelConditions = [
  /**
   * @TODO
   * zod 에서 hermes 가 지원하지 않는 RegExp 를 사용 중이며,
   * 대응 가능한 swc 구성/플러그인이 존재하지 않기에 babel 로 트랜스파일하도록 합니다
   *
   * @see zod {@link https://github.com/colinhacks/zod/issues/2302}
   */
  (_code: string, path: string) => path.includes('node_modules/zod'),
];
