import { type ComponentProps, PureComponent, RefObject, createRef } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';
import IOContext, { IOContextValue } from './IOContext';
import IOManager from './IOManager';
import { Root, RootMargin } from './IntersectionObserver';

export interface IOComponentProps {
  rootMargin?: RootMargin;
}

/**
 * @category Functions
 * @kind function
 * @name withIO
 * @description
 * A Higher-Order Component (HoC) that wraps a component with `IOContext` to enable Intersection Observer functionality.
 *
 * @argument
 * @param {React.ComponentType} [BaseComponent] - Callback function that is called when the component is mounted.
 * @param {string[]} [methods] - List of event handler names from BaseComponent to be bound.
 * @returns {React.ComponentType} - Returns a wrapped component that can use Intersection Observer functionality.
 */
function withIO<
  CompProps extends Pick<
    ComponentProps<typeof ScrollView>,
    'horizontal' | 'scrollEventThrottle' | 'onContentSizeChange' | 'onLayout' | 'onScroll'
  >,
>(BaseComponent: React.ComponentType<CompProps>, methods: string[]) {
  type ScrollableComponentProps = CompProps & IOComponentProps;
  const IOScrollableComponent = class extends PureComponent<ScrollableComponentProps> {
    protected node: any;
    protected scroller: RefObject<any>;
    protected root: Root;
    protected manager: IOManager;
    protected contextValue: IOContextValue;

    constructor(props: ScrollableComponentProps) {
      super(props);

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      this.scroller = createRef();
      this.node = null;
      this.root = {
        get node() {
          return self.node;
        },
        get horizontal() {
          return Boolean(self.props.horizontal);
        },
        current: {
          contentInset: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          },
          contentOffset: {
            x: 0,
            y: 0,
          },
          contentSize: {
            width: 0,
            height: 0,
          },
          layoutMeasurement: {
            width: 0,
            height: 0,
          },
          zoomScale: 1,
        },
      };
      const manager = new IOManager({
        root: this.root,
        get rootMargin() {
          return self.props.rootMargin;
        },
      });
      this.manager = manager;
      this.contextValue = {
        manager,
      };
    }

    componentDidMount() {
      // Prefer a native scroll ref (FlatList/VirtualizedList),
      // otherwise fall back to the host ref (ScrollView).
      this.node = this.resolveRootNode();
      methods.forEach((method) => {
        (this as any)[method] = (...args: any) => {
          this.scroller.current?.[method]?.(...args);
        };
      });
    }

    render() {
      return (
        <IOContext.Provider value={this.contextValue}>
          <BaseComponent
            scrollEventThrottle={16}
            {...this.props}
            ref={this.scroller}
            onContentSizeChange={this.handleContentSizeChange}
            onLayout={this.handleLayout}
            onScroll={this.handleScroll}
          />
        </IOContext.Provider>
      );
    }

    // Private helpers to keep type-safety encapsulated
    private isRefObject<T>(v: unknown): v is RefObject<T> {
      return typeof v === 'object' && v !== null && 'current' in (v as Record<string, unknown>);
    }

    private toView(v: RefObject<View> | View | null | undefined): View | null {
      if (!v) {
        return null;
      }
      return this.isRefObject<View>(v) ? (v.current ?? null) : v;
    }

    private callIfFunction<T extends object, K extends string>(obj: T | null | undefined, key: K): unknown {
      if (!obj) {
        return null;
      }
      const rec = obj as unknown as Record<string, unknown>;
      const fn = rec[String(key)];
      if (typeof fn === 'function') {
        return fn.call(obj);
      }
      return null;
    }

    protected resolveRootNode = (): View | null => {
      const instance = this.scroller.current as unknown;

      // 1) Prefer native scroll ref (FlatList/VirtualizedList on Fabric)
      const viaNativeRef = this.callIfFunction(instance as object, 'getNativeScrollRef');
      const nativeFromNativeRef = this.toView(viaNativeRef as RefObject<View> | View | null | undefined);
      if (nativeFromNativeRef) {
        return nativeFromNativeRef;
      }

      // 2) Fallback to getScrollRef
      const viaScrollRef = this.callIfFunction(instance as object, 'getScrollRef');
      const nativeFromScrollRef = this.toView(viaScrollRef as RefObject<View> | View | null | undefined);
      if (nativeFromScrollRef) {
        return nativeFromScrollRef;
      }

      // 3) Fallback to getScrollableNode (exclude numeric handles)
      const scrollable = this.callIfFunction(instance as object, 'getScrollableNode');
      if (scrollable && typeof scrollable !== 'number') {
        return scrollable as View;
      }

      // 4) Lastly, treat the instance itself as a View or RefObject<View>
      return this.toView(instance as RefObject<View> | View | null | undefined);
    };

    protected handleContentSizeChange = (width: number, height: number) => {
      const { contentSize } = this.root.current;
      if (width !== contentSize.width || height !== contentSize.height) {
        this.root.current.contentSize = { width, height };
        if (width > 0 && height > 0 && this.root.onLayout) {
          this.root.onLayout();
        }
      }
      const { onContentSizeChange } = this.props;
      if (onContentSizeChange) {
        onContentSizeChange(width, height);
      }
    };

    protected handleLayout = (event: LayoutChangeEvent) => {
      const {
        nativeEvent: { layout },
      } = event;
      const { layoutMeasurement } = this.root.current;
      if (layoutMeasurement.width !== layout.width || layoutMeasurement.height !== layout.height) {
        this.root.current.layoutMeasurement = layout;
      }
      const { onLayout } = this.props;
      if (onLayout) {
        onLayout(event);
      }
    };

    protected handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      this.root.current = event.nativeEvent;
      if (this.root.onScroll) {
        this.root.onScroll(this.root.current);
      }
      const { onScroll } = this.props;
      if (onScroll) {
        onScroll(event);
      }
    };
  };

  return IOScrollableComponent as typeof BaseComponent;
}

export default withIO;
