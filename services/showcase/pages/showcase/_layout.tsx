import { useRoute } from '@granite-js/native/@react-navigation/native';
import { Top } from 'components/Top';
import React, { PropsWithChildren } from 'react';

export default function ShowcaseLayout({ children }: PropsWithChildren) {
  const route = useRoute();
  const isShowcaseRoot = route.name === '/showcase';

  return (
    <>
      {isShowcaseRoot ? null : <Top label={`Path: ${route.name}`} />}
      {children}
    </>
  );
}
