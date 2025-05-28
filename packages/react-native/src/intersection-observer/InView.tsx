import { ComponentType, PureComponent, ReactElement, ReactNode, RefObject } from 'react';
import { LayoutChangeEvent, View, ViewProps } from 'react-native';
import IOContext, { IOContextValue } from './IOContext';
import { ObserverInstance } from './IOManager';
import { Element } from './IntersectionObserver';

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

  protected element: Element;
  protected instance: undefined | ObserverInstance;
  protected view: any;

  constructor(props: InViewProps<T>) {
    super(props);

    this.element = {
      inView: false,
      intersectionRatio: 0,
      layout: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      measureLayout: this.measureLayout,
    };
  }

  componentDidMount() {
    this.mounted = true;
    if (this.context?.manager) {
      this.instance = this.context.manager.observe(this.element, this.handleChange);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.context?.manager && this.instance) {
      this.context.manager.unobserve(this.element);
    }
  }

  protected handleChange = (inView: boolean, areaThreshold: number) => {
    if (this.mounted) {
      const { triggerOnce, onChange } = this.props;
      if (inView && triggerOnce) {
        if (this.context?.manager) {
          this.context?.manager.unobserve(this.element);
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
    if (layout.width !== this.element.layout.width || layout.height !== this.element.layout.height) {
      if (this.element.onLayout) {
        this.element.onLayout();
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
