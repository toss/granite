import { FC, ReactNode } from 'react';
import { RouteScreen } from '../types/RouteScreen';

export type LayoutScreen = FC<{ children: ReactNode }>;

/**
 * Starting from the layout mapped to a specific path, traverses up to parent layouts,
 * creates an array in the order of "innermost → outermost",
 * then builds up the final wrapper component using reduce.
 *
 * Example) map:
 *   './item/detail' => { component: ItemLayout, path: './item/_layout' }
 *   './item/_layout' => { component: RootLayout, path: './_layout' }
 *
 * => layoutChain = [ItemLayout, RootLayout]
 * => Final rendering result: <RootLayout><ItemLayout>children</ItemLayout></RootLayout>
 */
export function mergeParentLayoutScreen(screens: Map<string, RouteScreen>, path: string): LayoutScreen {
  // Final wrapper component
  let MergedLayout: FC<{ children?: ReactNode }> = ({ children }) => <>{children}</>;

  let currentPath: string | undefined = path;
  while (currentPath) {
    const routeScreen = screens.get(currentPath);
    if (!routeScreen) {
      break;
    }

    // Wrap with immediate parent wrapper
    const LayoutScreen = routeScreen.component as LayoutScreen;
    const ChildLayout = MergedLayout;
    MergedLayout = ({ children }) => (
      <LayoutScreen>
        <ChildLayout>{children}</ChildLayout>
      </LayoutScreen>
    );

    // Move to parent path
    currentPath = routeScreen.path;
  }

  return MergedLayout;
}
