import { render } from '@testing-library/react';
import { forwardRef } from 'react';
import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import IOContext, { IOContextValue } from './IOContext';
import IOManager, { ObserverInstance, ObserverInstanceCallback } from './IOManager';
import InView from './InView';
import { Element } from './IntersectionObserver';

/**
 * A stand-in for `IOManager` that captures the observed element/callback so the test
 * can drive intersection changes directly, without a real native scroll viewport.
 */
class FakeIntersectionObserverRegistry {
  observe = vi.fn((element: Element, callback: ObserverInstanceCallback): ObserverInstance => {
    this.callbacks.set(element, callback);
    return { callback, element, observerId: 1, observer: null as never };
  });

  unobserve = vi.fn((element: Element) => {
    this.callbacks.delete(element);
  });

  private callbacks = new Map<Element, ObserverInstanceCallback>();

  /** Emits an intersection change to every element this manager observes. */
  emit(inView: boolean, intersectionRatio: number) {
    for (const callback of this.callbacks.values()) {
      callback(inView, intersectionRatio);
    }
  }

  get asManager(): IOManager {
    return this as unknown as IOManager;
  }
}

function renderInView(contextValue: IOContextValue, onChange: (inView: boolean, ratio: number) => void) {
  return render(
    <IOContext.Provider value={contextValue}>
      <InView onChange={onChange}>
        <View />
      </InView>
    </IOContext.Provider>
  );
}

describe('InView', () => {
  it('observes the single ancestor manager and forwards its intersection changes', () => {
    const manager = new FakeIntersectionObserverRegistry();
    const onChange = vi.fn();

    renderInView({ manager: manager.asManager, parent: { manager: null } }, onChange);

    expect(manager.observe).toHaveBeenCalledTimes(1);

    manager.emit(true, 0.3);

    expect(onChange).toHaveBeenCalledWith(true, 0.3);
  });

  it('observes every ancestor viewport when scroll containers are nested', () => {
    const inner = new FakeIntersectionObserverRegistry();
    const outer = new FakeIntersectionObserverRegistry();
    const onChange = vi.fn();

    renderInView(
      {
        manager: inner.asManager,
        parent: { manager: outer.asManager, parent: { manager: null } },
      },
      onChange
    );

    expect(inner.observe).toHaveBeenCalledTimes(1);
    expect(outer.observe).toHaveBeenCalledTimes(1);
  });

  it('reports visible only when the element intersects ALL ancestor viewports (AND)', () => {
    const inner = new FakeIntersectionObserverRegistry();
    const outer = new FakeIntersectionObserverRegistry();
    const onChange = vi.fn();

    renderInView(
      {
        manager: inner.asManager,
        parent: { manager: outer.asManager, parent: { manager: null } },
      },
      onChange
    );

    // Visible in the inner (horizontal) viewport, but the outer (vertical) viewport
    // hasn't scrolled it into view yet -> must NOT be considered visible.
    inner.emit(true, 0.5);
    expect(onChange).not.toHaveBeenCalled();

    // Now visible in the outer viewport too -> visible, with the most restrictive
    // (smallest) ratio reported.
    outer.emit(true, 1);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true, 0.5);

    // Scrolling the outer viewport away hides it again even though the inner viewport
    // still reports it visible.
    onChange.mockClear();
    outer.emit(false, 0);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(false, 0);
  });

  it('does not re-notify when the combined visibility is unchanged', () => {
    const inner = new FakeIntersectionObserverRegistry();
    const outer = new FakeIntersectionObserverRegistry();
    const onChange = vi.fn();

    renderInView(
      {
        manager: inner.asManager,
        parent: { manager: outer.asManager, parent: { manager: null } },
      },
      onChange
    );

    inner.emit(true, 0.5);
    outer.emit(true, 1);
    onChange.mockClear();

    // The outer ratio changes but the inner viewport stays the more restrictive one,
    // so the combined result (visible, ratio 0.5) is unchanged.
    outer.emit(true, 0.8);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('unobserves every ancestor manager on unmount', () => {
    const inner = new FakeIntersectionObserverRegistry();
    const outer = new FakeIntersectionObserverRegistry();
    const onChange = vi.fn();

    const { unmount } = renderInView(
      {
        manager: inner.asManager,
        parent: { manager: outer.asManager, parent: { manager: null } },
      },
      onChange
    );

    unmount();

    expect(inner.unobserve).toHaveBeenCalledTimes(1);
    expect(outer.unobserve).toHaveBeenCalledTimes(1);
  });

  it('does not forward its own API props (onChange, triggerOnce) to the rendered view', () => {
    const manager = new FakeIntersectionObserverRegistry();
    const onChange = vi.fn();
    const received: Record<string, unknown>[] = [];
    const CaptureView = forwardRef<View, Record<string, unknown>>((props, ref) => {
      received.push(props);
      return <View ref={ref} />;
    });

    render(
      <IOContext.Provider value={{ manager: manager.asManager, parent: { manager: null } }}>
        <InView as={CaptureView} triggerOnce onChange={onChange} testID="target">
          <View />
        </InView>
      </IOContext.Provider>
    );

    const props = received.at(-1);
    // API props must not leak: `onChange` on a host View is a bubbling event handler,
    // so change events from descendants (e.g. TextInput) would call the observer
    // callback with a SyntheticEvent.
    expect(props).not.toHaveProperty('onChange');
    expect(props).not.toHaveProperty('triggerOnce');
    // Regular ViewProps still pass through.
    expect(props).toHaveProperty('testID', 'target');
  });

  it('with triggerOnce, stops observing all ancestors once visible', () => {
    const inner = new FakeIntersectionObserverRegistry();
    const outer = new FakeIntersectionObserverRegistry();
    const onChange = vi.fn();

    render(
      <IOContext.Provider
        value={{
          manager: inner.asManager,
          parent: { manager: outer.asManager, parent: { manager: null } },
        }}
      >
        <InView triggerOnce onChange={onChange}>
          <View />
        </InView>
      </IOContext.Provider>
    );

    inner.emit(true, 0.5);
    outer.emit(true, 1);

    expect(inner.unobserve).toHaveBeenCalledTimes(1);
    expect(outer.unobserve).toHaveBeenCalledTimes(1);
  });
});
