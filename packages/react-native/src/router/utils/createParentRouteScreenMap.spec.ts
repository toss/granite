import { describe, it, expect } from 'vitest';
import { createParentRouteScreenMap } from './createParentRouteScreenMap';
import type { RouteScreen } from '../types/RouteScreen';

describe('createParentRouteScreenMap', () => {
  describe('When there are nested layouts', () => {
    it('Each page is mapped to its nearest parent layout', () => {
      const paths: RouteScreen[] = [
        { path: './granite-module/_layout', component: () => null },
        { path: './granite-module/test', component: () => null },
        { path: './about/_layout', component: () => null },
        { path: './about/test', component: () => null },
        { path: './about', component: () => null },
        { path: './image', component: () => null },
      ];

      const layoutMap = createParentRouteScreenMap(paths, '_layout');

      // Pages in granite-module directory are mapped to their layout
      expect(layoutMap.get('./granite-module/test')?.path).toBe('./granite-module/_layout');

      // Pages in about directory are mapped to their layout
      expect(layoutMap.get('./about')?.path).toBe('./about/_layout');
      expect(layoutMap.get('./about/test')?.path).toBe('./about/_layout');

      // Pages without layout are undefined
      expect(layoutMap.get('./image')).toBeUndefined();

      // Layout files are not mapped because there's no layout at the root
      expect(layoutMap.get('./granite-module/_layout')).toBeUndefined();
      expect(layoutMap.get('./about/_layout')).toBeUndefined();
    });

    it('If there is a root layout, pages without layout are mapped to the root layout', () => {
      const paths: RouteScreen[] = [
        { path: './_layout', component: () => null },
        { path: './image', component: () => null },
        { path: './granite-module/_layout', component: () => null },
        { path: './granite-module/test', component: () => null },
        { path: './about/_layout', component: () => null },
        { path: './about', component: () => null },
        { path: './about/test', component: () => null },
      ];

      const layoutMap = createParentRouteScreenMap(paths, '_layout');

      // Pages in each directory are mapped to their layout
      expect(layoutMap.get('./granite-module/test')?.path).toBe('./granite-module/_layout');
      expect(layoutMap.get('./about')?.path).toBe('./about/_layout');
      expect(layoutMap.get('./about/test')?.path).toBe('./about/_layout');

      // Pages without layout are mapped to root layout
      expect(layoutMap.get('./image')?.path).toBe('./_layout');
      expect(layoutMap.get('./_layout')).toBeUndefined();
      expect(layoutMap.get('./granite-module/_layout')?.path).toBe('./_layout');
      expect(layoutMap.get('./about/_layout')?.path).toBe('./_layout');
    });

    it('Layout mapping works correctly in nested directory structure', () => {
      const paths: RouteScreen[] = [
        { path: './nested', component: () => null },
        { path: './nested/_layout', component: () => null },
        { path: './nested/test', component: () => null },
      ];

      const layoutMap = createParentRouteScreenMap(paths, '_layout');

      // nested is mapped to nested/_layout
      expect(layoutMap.get('./nested')?.path).toBe('./nested/_layout');

      // nested/test is mapped to nested/_layout
      expect(layoutMap.get('./nested/test')?.path).toBe('./nested/_layout');

      expect(layoutMap.get('./nested/_layout')?.path).toBeUndefined();
    });

    it('Layout mapping works correctly in double nested directory structure', () => {
      const paths: RouteScreen[] = [
        { path: './nested/_layout', component: () => null },
        { path: './nested/test', component: () => null },
        { path: './nested/deep/_layout', component: () => null },
        { path: './nested/deep/test', component: () => null },
      ];

      const layoutMap = createParentRouteScreenMap(paths, '_layout');

      // nested/test is mapped to nested/_layout
      expect(layoutMap.get('./nested/test')?.path).toBe('./nested/_layout');

      // nested/deep/test is mapped to nested/deep/_layout
      expect(layoutMap.get('./nested/deep/test')?.path).toBe('./nested/deep/_layout');

      // nested/deep/_layout is mapped to nested/_layout
      expect(layoutMap.get('./nested/deep/_layout')?.path).toBe('./nested/_layout');

      // nested/_layout is not mapped
      expect(layoutMap.get('./nested/_layout')?.path).toBeUndefined();
    });

    it('Layout mapping works correctly in triple nested directory structure', () => {
      const paths: RouteScreen[] = [
        { path: './nested/_layout', component: () => null },
        { path: './nested/test', component: () => null },
        { path: './nested/deep/_layout', component: () => null },
        { path: './nested/deep/test', component: () => null },
        { path: './nested/deep/deeper/_layout', component: () => null },
        { path: './nested/deep/deeper/test', component: () => null },
      ];

      const layoutMap = createParentRouteScreenMap(paths, '_layout');

      // nested/test is mapped to nested/_layout
      expect(layoutMap.get('./nested/test')?.path).toBe('./nested/_layout');

      // nested/deep/test is mapped to nested/deep/_layout
      expect(layoutMap.get('./nested/deep/test')?.path).toBe('./nested/deep/_layout');

      // nested/deep/deeper/test is mapped to nested/deep/deeper/_layout
      expect(layoutMap.get('./nested/deep/deeper/test')?.path).toBe('./nested/deep/deeper/_layout');

      // nested/deep/deeper/_layout is mapped to nested/deep/_layout
      expect(layoutMap.get('./nested/deep/deeper/_layout')?.path).toBe('./nested/deep/_layout');

      // nested/deep/_layout is mapped to nested/_layout
      expect(layoutMap.get('./nested/deep/_layout')?.path).toBe('./nested/_layout');

      // nested/_layout is not mapped
      expect(layoutMap.get('./nested/_layout')?.path).toBeUndefined();
    });
  });

  describe('When there are no layouts', () => {
    it('All pages are mapped to undefined', () => {
      const paths: RouteScreen[] = [
        { path: './page1', component: () => null },
        { path: './page2', component: () => null },
        { path: './nested/page3', component: () => null },
        { path: './nested/deep/page4', component: () => null },
      ];

      const layoutMap = createParentRouteScreenMap(paths, '_layout');

      // All pages are undefined
      expect(layoutMap.get('./page1')).toBeUndefined();
      expect(layoutMap.get('./page2')).toBeUndefined();
      expect(layoutMap.get('./nested/page3')).toBeUndefined();
      expect(layoutMap.get('./nested/deep/page4')).toBeUndefined();
    });
  });

  it('Nested _layout is mapped to parent _layout', () => {
    const paths: RouteScreen[] = [
      { path: './_layout', component: () => null },
      { path: './nested/_layout', component: () => null },
      { path: './nested/test', component: () => null },
      { path: './nested/deep/_layout', component: () => null },
      { path: './nested/deep/test', component: () => null },
    ];

    const layoutMap = createParentRouteScreenMap(paths, '_layout');
    expect(layoutMap.get('./nested/deep/test')?.path).toBe('./nested/deep/_layout');
    expect(layoutMap.get('./nested/deep/_layout')?.path).toBe('./nested/_layout');
    expect(layoutMap.get('./nested/_layout')?.path).toBe('./_layout');
    expect(layoutMap.get('./_layout')?.path).toBeUndefined();
  });
});
