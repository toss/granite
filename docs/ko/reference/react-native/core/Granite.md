---	
sourcePath: packages/react-native/src/app/Granite.tsx	
---	
# Granite	





## 시그니처	

```typescript	
Granite: {	
    registerApp(AppContainer: ComponentType<PropsWithChildren<InitialProps>>, { appName, context, router }: GraniteProps): (initialProps: InitialProps) => JSX.Element;	
    readonly appName: string;	
}	
```	





### 프로퍼티	
<ul class="post-parameters-ul">	
  <li class="post-parameters-li post-parameters-li-root">	
    <span class="post-parameters--name">registerApp</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">RegisterService</span>	
    <br />	
    <p class="post-parameters--description">이 함수는 서비스의 기본 환경을 설정해주고, 복잡한 설정을 따로 할 필요 없이 서비스 개발을 빠르게 시작할 수 있게 도와줘요. <code>appName</code>만 전달하면 파일 기반 라우팅, 쿼리 파라미터 처리, 뒤로 가기 제어 등 여러 기능을 바로 사용할 수 있어요.</p>	
  </li>	
</ul>	


`Granite.registerApp` 함수가 제공하는 기능은 다음과 같아요.	
- 라우팅: 파일 경로에 맞게 URL이 자동으로 매핑돼요. Next.js의 파일 기반 라우팅과 비슷한 방식으로 동작해요. 예를 들어 `/my-service/pages/index.ts` 파일은 `scheme://my-service` 주소로 접근할 수 있고, `/my-service/pages/home.ts 파일은 scheme://my-service/home` 주소로 접근할 수 있어요.	
- 쿼리 파라미터: URL 스킴으로 전달 받은 쿼리 파라미터를 쉽게 사용할 수 있어요. 예를 들어, `referrer` 파라미터를 받아서 로그를 남길 수 있어요.	
- 뒤로 가기 제어: 뒤로 가기 이벤트를 제어할 수 있어요. 예를 들어, 사용자가 화면에서 뒤로 가기를 누르면 다이얼로그를 띄우거나 화면을 닫을 수 있어요.	
- 화면 가시성(Visibility): 화면이 사용자에게 보이는지, 가려져 있는지 알 수 있어요. 예를 들어, 사용자가 홈 화면으로 나갔을 때 이 값을 활용해 특정 동작을 처리할 수 있어요.	







## 예제	

### `Granite` 컴포넌트로 만드는 예제	

```tsx	
import { PropsWithChildren } from 'react';	
import { Granite, InitialProps } from '@granite-js/react-native';	
import { context } from '../require.context';	

function AppContainer({ children }: PropsWithChildren<InitialProps>) {	
 return <>{children}</>;	
}	

export default Granite.registerApp(AppContainer, {	
 appName: 'my-app',	
 context,	
});	

```	
