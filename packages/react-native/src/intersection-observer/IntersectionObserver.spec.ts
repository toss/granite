import { NativeScrollEvent } from 'react-native';
import { describe, expect, it } from 'vitest';
import IntersectionObserver, { Element, IntersectionObserverEntry, Root } from './IntersectionObserver';

const VIEWPORT = 300;

function createRoot(horizontal: boolean, contentOffset: { x: number; y: number }): Root {
  return {
    node: {},
    horizontal,
    current: {
      contentOffset,
      contentSize: { width: 1000, height: 1000 },
      layoutMeasurement: { width: VIEWPORT, height: VIEWPORT },
    } as NativeScrollEvent,
  };
}

/**
 * Creates an observed element positioned at a fixed layout. `measureLayout`
 * synchronously reports that layout so we can drive the observer without a native
 * scroll view.
 */
function createElement(layout: { x: number; y: number; width: number; height: number }): Element {
  return {
    inView: false,
    intersectionRatio: 0,
    layout: { x: 0, y: 0, width: 0, height: 0 },
    measureLayout: (_node, callback) => callback(layout.x, layout.y, layout.width, layout.height),
  };
}

/**
 * Observes the element, forces a measure + intersection computation, and returns the
 * flattened entries the observer emitted.
 */
function measure(root: Root, element: Element): IntersectionObserverEntry[] {
  const entries: IntersectionObserverEntry[] = [];
  const observer = new IntersectionObserver((changed) => entries.push(...changed), { root });
  observer.observe(element);
  // Synchronously trigger measureTarget -> onScrollHandler (throttle leading edge).
  root.onLayout?.();
  return entries;
}

describe('IntersectionObserver', () => {
  it('does not mark a horizontally adjacent target (0px visible) as intersecting', () => {
    const root = createRoot(true, { x: 0, y: 0 });
    // Target's left edge sits exactly on the viewport's right edge.
    const element = createElement({ x: VIEWPORT, y: 0, width: VIEWPORT, height: 200 });

    const entries = measure(root, element);

    expect(entries.some((entry) => entry.isIntersecting)).toBe(false);
    expect(element.inView).toBe(false);
  });

  it('does not mark a vertically adjacent target (0px visible) as intersecting', () => {
    const root = createRoot(false, { x: 0, y: 0 });
    // Target's top edge sits exactly on the viewport's bottom edge.
    const element = createElement({ x: 0, y: VIEWPORT, width: 200, height: VIEWPORT });

    const entries = measure(root, element);

    expect(entries.some((entry) => entry.isIntersecting)).toBe(false);
    expect(element.inView).toBe(false);
  });

  it('marks a target as intersecting once even 1px is visible', () => {
    const root = createRoot(true, { x: 0, y: 0 });
    // Target overlaps the viewport by 1px on its left edge.
    const element = createElement({ x: VIEWPORT - 1, y: 0, width: VIEWPORT, height: 200 });

    const entries = measure(root, element);

    expect(entries.some((entry) => entry.isIntersecting)).toBe(true);
    expect(element.inView).toBe(true);
  });

  it('reports a fully visible target with ratio 1', () => {
    const root = createRoot(true, { x: 0, y: 0 });
    const element = createElement({ x: 0, y: 0, width: VIEWPORT, height: 200 });

    const entries = measure(root, element);

    const intersecting = entries.find((entry) => entry.isIntersecting);
    expect(intersecting?.intersectionRatio).toBe(1);
  });
});
