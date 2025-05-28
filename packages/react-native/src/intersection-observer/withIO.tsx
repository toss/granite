import { type ComponentProps, PureComponent, RefObject, createRef } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, findNodeHandle } from 'react-native';
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
      this.node = findNodeHandle(this.scroller.current);
      methods.forEach((method) => {
        (this as any)[method] = (...args: any) => {
          this.scroller.current?.[method]?.(...args);
        };
      });
    }

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
  };

  return IOScrollableComponent as typeof BaseComponent;
}

export default withIO;
