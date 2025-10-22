import { type DefaultTheme, defineConfig } from 'vitepress';
import referenceManifest from '../ko/reference/manifest.json';
import { categorizeManifest } from './utils';

export const ko = defineConfig({
  lang: 'ko',
  title: 'Granite',
  description: 'React Native Framework',
  themeConfig: {
    sidebar: sidebar(),
    nav: nav(),
    darkModeSwitchLabel: '테마',
  },
});

function sidebar(): DefaultTheme.Sidebar {
  return [
    {
      text: '가이드',
      items: [
        { text: '소개', link: '/ko/guides/introduction' },
        { text: 'vs 기본 RN', link: '/ko/guides/comparison' },
        {
          text: '시작',
          items: [
            { text: '첫 Granite 앱 만들기', link: '/ko/guides/quick-start/create-your-app' },
            { text: 'AWS 인프라 만들기', link: '/ko/guides/quick-start/setup-aws' },
            { text: 'Granite 앱 배포하고 실행하기', link: '/ko/guides/quick-start/deploy-your-app' },
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
        {
          text: '기타',
          items: [{ text: '테스트 앱 설치하기', link: '/ko/guides/miscellaneous/install-native-app' }],
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

function nav(): DefaultTheme.NavItem[] {
  return [
    { text: '소개', link: '/ko/guides/introduction' },
    {
      text: '가이드',
      link: '/ko/guides/quick-start/create-your-app',
    },
    {
      text: '레퍼런스',
      link: '/ko/reference/react-native/config/defineConfig',
    },
  ];
}
