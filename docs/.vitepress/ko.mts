import { type DefaultTheme, defineConfig } from 'vitepress';
import referenceManifest from '../ko/reference/manifest.json';
import { categorizeManifest } from './utils';

export const ko = defineConfig({
  lang: 'ko',
  title: 'Granite',
  description: 'React Native Framework',
  themeConfig: {
    sidebar: sidebar(),
  },
});

function sidebar(): DefaultTheme.Sidebar {
  return [
    {
      text: '가이드',
      items: [
        { text: '소개', link: '/ko/guides/introduction' },
        {
          text: '빠른 시작',
          items: [
            { text: '샌드박스 앱 설치', link: '/ko/guides/quick-start/install-native-app' },
            { text: 'AWS에 인프라 배포하기', link: '/ko/guides/quick-start/setup-aws' },
            { text: '앱 배포하기', link: '/ko/guides/quick-start/deploy-your-app' },
            { text: '앱 실행하기', link: '/ko/guides/quick-start/run-your-app' },
          ],
        },
        {
          text: 'Granite Router',
          items: [
            { text: '플러그인 사용하기', link: '/ko/guides/granite-router/plugin-router' },
            { text: '화면 이동하기', link: '/ko/guides/granite-router/routing' },
            { text: '화면 파라미터 정의하기', link: '/ko/guides/granite-router/params' },
            { text: '공통 레이아웃 구성하기', link: '/ko/guides/granite-router/layouts' },
          ],
        },
      ],
    },
    {
      text: '레퍼런스',
      items: categorizeManifest(referenceManifest, 'ko'),
    },
  ];
}

export const search: DefaultTheme.LocalSearchOptions['locales'] = {
  ko: {
    translations: {
      button: {
        buttonText: '검색',
        buttonAriaLabel: '검색',
      },
      modal: {
        backButtonTitle: '뒤로가기',
        displayDetails: '더보기',
        footer: {
          closeKeyAriaLabel: '닫기',
          closeText: '닫기',
          navigateDownKeyAriaLabel: '아래로',
          navigateText: '이동',
          navigateUpKeyAriaLabel: '위로',
          selectKeyAriaLabel: '선택',
          selectText: '선택',
        },
        noResultsText: '검색 결과를 찾지 못했어요.',
        resetButtonTitle: '모두 지우기',
      },
    },
  },
};
