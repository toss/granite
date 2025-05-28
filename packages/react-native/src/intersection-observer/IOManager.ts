import IntersectionObserver, {
  IntersectionObserverOptions,
  IntersectionObserverEntry,
  Element,
} from './IntersectionObserver';

export type ObserverInstanceCallback = (inView: boolean, intersectionRatio: number) => void;

export interface ObserverInstance {
  readonly callback: ObserverInstanceCallback;
  readonly element: Element;
  readonly observerId: number;
  readonly observer: IntersectionObserver;
}

/**
 * @kind class
 * @name IOManager
 * @description A class that tracks the visibility of DOM elements using `IntersectionObserver` instances and executes callbacks when elements enter or leave the viewport.
 * This class makes it easy to manage multiple elements and execute custom logic based on the visibility status of each element.
 */
class IOManager {
  io: IntersectionObserver;
  observerId: number;
  instanceMap: Map<Element, ObserverInstance> = new Map();

  constructor(options: IntersectionObserverOptions) {
    this.io = new IntersectionObserver(this.handleChange, options);
    this.observerId = 0;
  }

  handleChange = (entries: IntersectionObserverEntry[]) => {
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];

      if (entry == null) {
        continue;
      }

      const { target, isIntersecting, intersectionRatio } = entry;
      const instance = this.instanceMap.get(target);
      if (instance) {
        instance.callback(isIntersecting, intersectionRatio);
      }
    }
  };

  observe(element: Element, callback: ObserverInstanceCallback): ObserverInstance {
    const existInstance = this.instanceMap.get(element);
    if (existInstance) {
      return existInstance;
    }
    this.observerId += 1;
    const instance: ObserverInstance = {
      callback,
      element,
      observerId: this.observerId,
      observer: this.io,
    };
    this.instanceMap.set(element, instance);
    this.io.observe(element);
    return instance;
  }

  unobserve(element: any) {
    if (this.instanceMap.has(element)) {
      this.instanceMap.delete(element);
      this.io.unobserve(element);
    }
  }
}

export default IOManager;
