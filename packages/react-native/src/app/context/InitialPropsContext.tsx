import { createContext, useContext, type PropsWithChildren } from 'react';
import { InitialProps } from '../../initial-props';

export const InitialPropsContext = createContext<InitialProps | null>(null);

export function InitialPropsProvider({ children, initialProps }: PropsWithChildren<{ initialProps: InitialProps }>) {
  return <InitialPropsContext.Provider value={initialProps}>{children}</InitialPropsContext.Provider>;
}

/**
 * @public
 * @name useInitialProps
 * @category Core
 * @description React Native 앱에서 특정 화면에 진입할 때 네이티브(Android 또는 iOS)가 전달한 초기 데이터를 객체로 알려줘요. 이 데이터를 사용해 앱 실행 직후 테마나 사용자 설정을 바로 적용할 수 있어요. 예를 들어 네이티브에서 다크 모드를 사용하고 있다는 설정을 받아서 React Native 앱이 실행되면 다크 모드로 바로 사용할 수 있어요.
 * @returns {InitialProps} 앱의 초기 데이터
 * @example
 *
 * ### 초기 데이터로 다크 모드 여부 확인하기
 *
 * ```tsx
 * import { useInitialProps } from '@granite-js/react-native';
 *
 * function Page() {
 *   const initialProps = useInitialProps();
 *   // 'light' 또는 'dark'
 *   console.log(initialProps.initialColorPreference);
 *   return <></>;
 * }
 * ```
 */
export function useInitialProps<T extends InitialProps>() {
  const initialProps = useContext(InitialPropsContext);

  if (!initialProps) {
    throw new Error('InitialPropsContext not found');
  }

  return initialProps as T;
}
