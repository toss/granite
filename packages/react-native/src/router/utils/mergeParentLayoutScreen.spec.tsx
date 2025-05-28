import { render } from '@testing-library/react';
import { ReactNode } from 'react';
import { it, describe, expect } from 'vitest';
import { Screen } from '..';
import { mergeParentLayoutScreen } from './mergeParentLayoutScreen';
import { RouteScreen } from '../types/RouteScreen';

declare global {
  interface HTMLElement {
    innerHTML: string;
  }
}

function ItemLayout({ children }: { children: ReactNode }) {
  return <div id="item-layout">{children}</div>;
}

function RootLayout({ children }: { children: ReactNode }) {
  return <div id="root-layout">{children}</div>;
}

function SubItemLayout({ children }: { children: ReactNode }) {
  return <div id="sub-item-layout">{children}</div>;
}

describe('mergeParentLayoutScreen', () => {
  it('Parent layout and child layout should be nested in the correct order', () => {
    const map = new Map<string, RouteScreen>();

    map.set('./item/detail', {
      component: ItemLayout as Screen,
      path: './item/_layout',
    });

    map.set('./item/_layout', {
      component: RootLayout as Screen,
      path: './_layout',
    });

    const MergedLayout = mergeParentLayoutScreen(map, './item/detail');

    const { container } = render(<MergedLayout>item detail</MergedLayout>);

    // Should be nested in order: RootLayout > ItemLayout > content
    expect(container.innerHTML).toBe(
      render(
        <div id="root-layout">
          <div id="item-layout">item detail</div>
        </div>
      ).container.innerHTML
    );
  });

  it('Triple nested layout should render in the correct order', () => {
    const map = new Map<string, RouteScreen>();

    map.set('./item/detail/sub', {
      component: SubItemLayout as Screen,
      path: './item/detail/_layout',
    });

    map.set('./item/detail/_layout', {
      component: ItemLayout as Screen,
      path: './item/_layout',
    });

    map.set('./item/_layout', {
      component: RootLayout as Screen,
      path: './_layout',
    });

    const MergedLayout = mergeParentLayoutScreen(map, './item/detail/sub');

    const { container } = render(<MergedLayout>sub item detail</MergedLayout>);

    // Should be nested in order: RootLayout > ItemLayout > SubItemLayout > content
    expect(container.innerHTML).toBe(
      render(
        <div id="root-layout">
          <div id="item-layout">
            <div id="sub-item-layout">sub item detail</div>
          </div>
        </div>
      ).container.innerHTML
    );
  });

  it('Single layout should render correctly', () => {
    const map = new Map<string, RouteScreen>();

    map.set('./item/detail', {
      component: RootLayout as Screen,
      path: './_layout',
    });

    const MergedLayout = mergeParentLayoutScreen(map, './item/detail');

    const { container } = render(<MergedLayout>item detail</MergedLayout>);

    expect(container.innerHTML).toBe(render(<div id="root-layout">item detail</div>).container.innerHTML);
  });

  it('Should render only content when no layout is defined', () => {
    const map = new Map<string, RouteScreen>();

    const MergedLayout = mergeParentLayoutScreen(map, './item/detail');

    const { container } = render(<MergedLayout>item detail</MergedLayout>);

    expect(container.innerHTML).toBe(render(<>item detail</>).container.innerHTML);
  });
});
