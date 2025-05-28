import { throttle } from 'es-toolkit';
import { LayoutRectangle, NativeScrollEvent } from 'react-native';

export interface Root {
  /**
   * NodeHandle of the target component
   */
  node: any;
  /**
   * Whether horizontal scroll is enabled
   */
  horizontal: boolean;
  /**
   * Scroll event of the target component
   */
  current: NativeScrollEvent;
  onLayout?: () => void;
  onScroll?: (event: NativeScrollEvent) => void;
}

export interface Element {
  inView: boolean;
  intersectionRatio: number;
  layout: LayoutRectangle;
  measureLayout: (node: any, callback: (x: number, y: number, width: number, height: number) => void) => void;
  onLayout?: () => void;
}

export interface IntersectionObserverEntry {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
}

export interface RootMargin {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface IntersectionObserverOptions {
  /**
   * Information about the component that wraps the element
   */
  root: Root;
  rootMargin?: RootMargin;
  threshold?: number | number[];
}

export type IntersectionObserverCallback = (entries: IntersectionObserverEntry[]) => void;

export const defaultRootMargin: RootMargin = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

export const defaultThreshold = 0;

/**
 * @kind class
 * @name IntersectionObserver
 * @description
 * IntersectionObserver implemented for React Native environment.
 *
 * @param {IntersectionObserverCallback} callback - Callback function that is called when the visibility state of the target element changes.
 * @param {IntersectionObserverOptions} options - Options object that controls the behavior of IntersectionObserver.
 */
class IntersectionObserver {
  protected callback: IntersectionObserverCallback;
  protected options: IntersectionObserverOptions;
  protected targets: Element[];

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverOptions) {
    this.callback = callback;
    this.options = options;
    this.targets = [];
    this.options.root.onLayout = this.handleLayout;
    this.options.root.onScroll = this.handleScroll;
  }

  protected measureTarget = (target: Element) => {
    const rootNode = this.options.root.node;
    if (rootNode) {
      target.measureLayout(rootNode, (x, y, width, height) => {
        target.layout = {
          x,
          y,
          width,
          height,
        };
        this.handleScroll();
      });
    }
  };

  protected handleLayout = throttle(
    () => {
      for (let index = 0; index < this.targets.length; index += 1) {
        const target = this.targets[index];

        if (target != null) {
          this.measureTarget(target);
        }
      }
    },
    300,
    { edges: ['trailing'] }
  ) as () => void;

  protected handleScroll = throttle(
    () => {
      const rootMargin = this.options?.rootMargin || defaultRootMargin;

      const {
        horizontal,
        current: { contentOffset, contentSize, layoutMeasurement },
      } = this.options.root;
      if (
        contentSize.width <= 0 ||
        contentSize.height <= 0 ||
        layoutMeasurement.width <= 0 ||
        layoutMeasurement.height <= 0
      ) {
        return;
      }
      const contentOffsetWithLayout = horizontal
        ? contentOffset.x + layoutMeasurement.width
        : contentOffset.y + layoutMeasurement.height;
      const changedTargets: IntersectionObserverEntry[] = [];
      for (let index = 0; index < this.targets.length; index += 1) {
        const target = this.targets[index];

        if (target == null) {
          continue;
        }

        const targetLayout = target.layout;
        if (!targetLayout || targetLayout.width === 0 || targetLayout.height === 0) {
          continue;
        }

        const previousIntersectionRatio = target.intersectionRatio;

        let isIntersecting = false;
        let intersectionRatio = previousIntersectionRatio;

        if (horizontal) {
          const visibleTargetMinX = Math.max(contentOffset.x - (rootMargin.left || 0), targetLayout.x);
          const visibleTargetMaxX = Math.min(
            contentOffsetWithLayout + (rootMargin.left || 0),
            targetLayout.x + targetLayout.width
          );
          const visibleHeight = Math.max(visibleTargetMaxX - visibleTargetMinX, 0);

          intersectionRatio = visibleHeight / targetLayout.height;
          isIntersecting =
            contentOffsetWithLayout + (rootMargin.right || 0) >= targetLayout.x &&
            contentOffset.x - (rootMargin.left || 0) <= targetLayout.x + targetLayout.width;
        } else {
          const visibleTargetMinY = Math.max(contentOffset.y - (rootMargin.top || 0), targetLayout.y);
          const visibleTargetMaxY = Math.min(
            contentOffsetWithLayout + (rootMargin.bottom || 0),
            targetLayout.y + targetLayout.height
          );
          const visibleHeight = Math.max(visibleTargetMaxY - visibleTargetMinY, 0);

          intersectionRatio = visibleHeight / targetLayout.height;
          isIntersecting =
            contentOffsetWithLayout + (rootMargin.bottom || 0) >= targetLayout.y &&
            contentOffset.y - (rootMargin.top || 0) <= targetLayout.y + targetLayout.height;
        }

        intersectionRatio = Math.floor(intersectionRatio * 100) / 100;

        if (target.inView !== isIntersecting || target.intersectionRatio !== intersectionRatio) {
          target.inView = isIntersecting;
          target.intersectionRatio = intersectionRatio;

          changedTargets.push({
            target,
            isIntersecting,
            intersectionRatio,
          });
        }
      }
      this.callback(changedTargets);
    },
    100,
    { edges: ['trailing'] }
  ) as () => void;

  public observe(target: Element) {
    const index = this.targets.indexOf(target);
    if (index < 0) {
      target.onLayout = this.handleLayout;
      this.targets.push(target);
    }
  }

  public unobserve(target: Element) {
    const index = this.targets.indexOf(target);
    if (index >= 0) {
      target.onLayout = undefined;
      this.targets.splice(index, 1);
    }
  }
}

export default IntersectionObserver;
