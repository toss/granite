import { useInitialProps } from './InitialPropsContext';

/**
 * @public
 * @name useInitialSearchParams
 * @category EnvironmentCheck
 * @description 앱을 처음 실행할 때 전달된 URL의 쿼리 파라미터를 바로 객체 형태로 반환하는 Hook이에요. 로그인이나 테마 설정 같은 초기 진입 처리를 즉시 적용할 수 있어서 사용자 경험을 빠르게 맞출 수 있어요. 잘못된 URL이 들어오면 안전하게 빈 객체를 반환해요. 네이티브 플랫폼(Android 또는 iOS)에서 앱으로 처음 전달한 URL에 쿼리 파라미터가 포함되어 있다면, 이 Hook을 사용해서 각 파라미터 값을 쉽게 읽을 수 있어요.
 *
 * @returns {Record<string, string>} 초기 URL에 포함된 쿼리 파라미터를 키-값 쌍으로 담은 객체예요. 쿼리 파라미터가 없거나 URL이 유효하지 않으면 빈 객체를 반환해요.
 * @example
 * ```tsx
 * import { useInitialSearchParams } from '@granite-js/react-native';
 *
 * function Page() {
 *   const params = useInitialSearchParams();
 *   // 예: 초기 URL이 myapp://home?userId=42&theme=dark 인 경우
 *   console.log(params.userId); // "42"
 *   console.log(params.theme);  // "dark"
 *   return <></>;
 * }
 * ```
 */
export function useInitialSearchParams() {
  const scheme = useInitialProps().scheme ?? '';
  try {
    return Object.fromEntries(new URL(scheme).searchParams);
  } catch {
    return {};
  }
}
