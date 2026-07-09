import { ComponentType, PureComponent, ReactElement, ReactNode, RefObject } from 'react';
import { LayoutChangeEvent, View, ViewProps } from 'react-native';
import IOContext, { IOContextValue } from './IOContext';
import IOManager from './IOManager';
import { Element } from './IntersectionObserver';

/**
 * Per-manager observation state. A single `InView` can be observed by multiple
 * `IOManager`s at once (one per ancestor scroll container). Each binding keeps its
 * own `Element` because every observer measures the view against a different root
 * and writes its own `layout`/`inView`/`intersectionRatio`.
 */
interface ManagerBinding {
  manager: IOManager;
  element: Element;
  inView: boolean;
  intersectionRatio: number;
}

export interface RenderProps {
  inView: boolean;
  onChange: (inView: boolean) => void;
}

export interface Props {
  [key: string]: any;
}

export type InViewProps<T = Props> = T & {
  children: ReactNode | ((fields: RenderProps) => ReactElement<View>);
  as?: ComponentType<any>;
  triggerOnce?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  onChange?: (inView: boolean, areaThreshold: number) => void;
};

export type InViewWrapper = ComponentType<{
  ref?: RefObject<any> | ((ref: any) => void);
  onLayout?: (event: LayoutChangeEvent) => void;
}>;

/**
 * @public
 * @category Screen Control
 * @name InView
 * @description
 * The `InView` component detects when an element starts to become visible on the screen or disappears from the screen.
 * When an element starts to become visible on the screen, the `onChanged` handler is called with `true` as the first argument. Conversely, when the element disappears from the screen, `false` is passed.
 * The second argument of the `onChanged` handler receives the exposure ratio of the element on the screen. The exposure ratio value ranges from `0` to `1.0`. For example, if `0.2` is passed, it means the component is 20% exposed on the screen.
 *
::: warning Note

`InView` must be used inside [IOScrollView](/reference/react-native/Screen%20Control/InView.md) or [IOFlatList](/reference/react-native/Screen%20Control/IOFlatList.md) that includes `IOContext`.
If used outside of `IOContext`, an `IOProviderMissingError` will occur.

:::

 * @param {Object} props - Props object passed to the component.
 * @param {React.ReactNode} props.children - Child components to be rendered under the component.
 * @param {React.ComponentType} [prop.as=View] - Specifies the component to actually render. Default is the [View](https://reactnative.dev/docs/view) component.
 * @param {boolean} [triggerOnce=false] - Use this option if you want to call the `onChange` callback only once when the element first becomes visible.
 * @param {(event: LayoutChangeEvent) => void} [onLayout] - Callback function called when there is a change in the layout.
 * @param {(inView: boolean, areaThreshold: number) => void} [onChange] - Callback function called when an element appears or disappears from the screen. The first argument receives the visibility status, and the second argument receives the exposure ratio.
 * 
 * @example
 * 
 * ### Detecting the `10%` point of an element using the `InView` component
 * 
 * ```tsx
 * import { LayoutChangeEvent, View, Text, Dimensions } from 'react-native';
 * import { InView, IOScrollView } from '@granite-js/react-native';
 * 
 * export function InViewExample() {
 *   const handleLayout = (event: LayoutChangeEvent) => {
 *     console.log('Layout changed', event.nativeEvent.layout);
 *   };
 * 
 *   const handleChange = (inView: boolean, areaThreshold: number) => {
 *     if (inView) {
 *       console.log(`Element is visible at ${areaThreshold * 100}% ratio`);
 *     } else {
 *       console.log('Element is not visible');
 *     }
 *   };
 * 
 *   return (
 *     <IOScrollView>
 *       <View style={{ height: HEIGHT, width: '100%', backgroundColor: 'blue' }}>
 *         <Text style={{ color: 'white' }}>Please scroll down</Text>
 *       </View>
 *       <InView onLayout={handleLayout} onChange={handleChange}>
 *         <View style={{ width: 100, height: 300, backgroundColor: 'yellow' }}>
 *           <View style={{ position: 'absolute', top: 30, width: 100, height: 1, borderWidth: 1 }}>
 *             <Text style={{ position: 'absolute', top: 0 }}>10% point</Text>
 *           </View>
 *         </View>
 *       </InView>
 *     </IOScrollView>
 *   );
 * }
 * ```
 */
class InView<T = ViewProps> extends PureComponent<InViewProps<T>> {
  static contextType = IOContext;
  static defaultProps: Partial<InViewProps> = {
    triggerOnce: false,
    as: View,
  };

  context: undefined | IOContextValue = undefined;
  mounted = false;

  protected bindings: ManagerBinding[] = [];
  protected combinedInView = false;
  protected combinedRatio = 0;
  protected lastWidth = 0;
  protected lastHeight = 0;
  protected view: any;

  componentDidMount() {
    this.mounted = true;
    // Observe the element in every ancestor viewport, from the innermost scroll
    // container up to the outermost. The element is considered visible only when it
    // intersects *all* of them (AND), matching the web `IntersectionObserver`, which
    // clips the target against every ancestor's scrollport.
    this.bindings = this.collectManagers().map((manager) => {
      const binding: ManagerBinding = {
        manager,
        inView: false,
        intersectionRatio: 0,
        element: {
          inView: false,
          intersectionRatio: 0,
          layout: { x: 0, y: 0, width: 0, height: 0 },
          measureLayout: this.measureLayout,
        },
      };
      manager.observe(binding.element, (inView, intersectionRatio) =>
        this.handleBindingChange(binding, inView, intersectionRatio)
      );
      return binding;
    });
  }

  componentWillUnmount() {
    this.mounted = false;
    for (const binding of this.bindings) {
      binding.manager.unobserve(binding.element);
    }
    this.bindings = [];
  }

  /**
   * Walks the `IOContext` chain from the nearest scroll container to the outermost,
   * collecting every non-null manager along the way.
   */
  protected collectManagers(): IOManager[] {
    const managers: IOManager[] = [];
    let context: IOContextValue | null | undefined = this.context;
    while (context != null) {
      if (context.manager != null) {
        managers.push(context.manager);
      }
      context = context.parent;
    }
    return managers;
  }

  protected handleBindingChange = (binding: ManagerBinding, inView: boolean, intersectionRatio: number) => {
    binding.inView = inView;
    binding.intersectionRatio = intersectionRatio;
    this.updateCombined();
  };

  /**
   * Recomputes the combined visibility across all ancestor viewports and notifies
   * `onChange` only when the AND-ed result actually changes. `intersectionRatio` is
   * reported as the smallest ratio among ancestors — the most restrictive viewport.
   */
  protected updateCombined() {
    if (!this.mounted || this.bindings.length === 0) {
      return;
    }

    const inView = this.bindings.every((binding) => binding.inView);
    const intersectionRatio = inView
      ? this.bindings.reduce((min, binding) => Math.min(min, binding.intersectionRatio), 1)
      : 0;

    if (inView === this.combinedInView && intersectionRatio === this.combinedRatio) {
      return;
    }

    this.combinedInView = inView;
    this.combinedRatio = intersectionRatio;
    this.handleChange(inView, intersectionRatio);
  }

  protected handleChange = (inView: boolean, areaThreshold: number) => {
    if (this.mounted) {
      const { triggerOnce, onChange } = this.props;
      if (inView && triggerOnce) {
        for (const binding of this.bindings) {
          binding.manager.unobserve(binding.element);
        }
      }
      if (onChange) {
        onChange(inView, areaThreshold);
      }
    }
  };

  protected handleRef = (ref: any) => {
    this.view = ref;
  };

  protected handleLayout = (event: LayoutChangeEvent) => {
    const {
      nativeEvent: { layout },
    } = event;
    if (layout.width !== this.lastWidth || layout.height !== this.lastHeight) {
      this.lastWidth = layout.width;
      this.lastHeight = layout.height;
      // Re-measure the target in every ancestor viewport when its size changes.
      for (const binding of this.bindings) {
        binding.element.onLayout?.();
      }
    }
    const { onLayout } = this.props;
    if (onLayout) {
      onLayout(event);
    }
  };

  measure = (...args: any) => {
    this.view.measure(...args);
  };

  measureInWindow = (...args: any) => {
    this.view.measureInWindow(...args);
  };

  measureLayout = (...args: any) => {
    this.view.measureLayout(...args);
  };

  setNativeProps = (...args: any) => {
    this.view.setNativeProps(...args);
  };

  focus = (...args: any) => {
    this.view.focus(...args);
  };

  blur = (...args: any) => {
    this.view.blur(...args);
  };

  render() {
    const { as, children, ...props } = this.props;
    if (typeof children === 'function') {
      return null;
    }
    const ViewComponent: InViewWrapper = (as || View) as InViewWrapper;
    return (
      <ViewComponent {...props} ref={this.handleRef} onLayout={this.handleLayout}>
        {children}
      </ViewComponent>
    );
  }
}

export default InView;
