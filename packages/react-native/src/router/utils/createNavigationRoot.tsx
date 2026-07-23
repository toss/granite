import { NavigationIndependentTree } from '@granite-js/native/@react-navigation/native';
import type { ReactElement } from 'react';

export function createNavigationRoot(navigation: ReactElement, independent: boolean): ReactElement {
  return independent ? <NavigationIndependentTree>{navigation}</NavigationIndependentTree> : navigation;
}
