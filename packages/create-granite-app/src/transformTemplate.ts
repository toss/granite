// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ExtractPlaceholders<T extends string> = T extends `${infer _Start}%%${infer Key}%%${infer Rest}`
  ? Key | ExtractPlaceholders<Rest>
  : never;

type TransformTemplateArgs<T extends string> = {
  [Key in ExtractPlaceholders<T>]: string;
};

/**
 * 템플릿 문자열에서 %%key%% 형식의 플레이스홀더를 values 객체의 값으로 대체합니다.
 * 제네릭 타입 T를 통해 템플릿 문자열의 플레이스홀더 키를 자동으로 추론하여 타입 안정성을 보장합니다.
 *
 * @example
 * const str = "안녕하세요 %%name%%님, 당신의 나이는 %%age%%살 입니다."
 * const result = transformTemplate(str, { name: "홍길동", age: "20" })
 * // 결과: "안녕하세요 홍길동님, 당신의 나이는 20살 입니다."
 */
export function transformTemplate<T extends string>(templateString: T, values: TransformTemplateArgs<T>): string {
  let result: string = templateString;
  for (const key in values) {
    const placeholder = `%%${key}%%`;
    result = result.replace(new RegExp(placeholder, 'g'), (values as any)[key]);
  }
  return result;
}
