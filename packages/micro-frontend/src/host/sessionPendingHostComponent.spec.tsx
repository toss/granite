import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsPendingHostComponentHidden } from './PendingHostComponent';
import {
  getIsPendingHostComponentHidden,
  hidePendingHostComponent,
  resetPendingHostComponent,
} from './pendingHostComponentStore';
import { createSessionRuntimeFixture } from '../../test/sessionRuntimeFixture';
import { getMicroFrontendGlobalContext } from '../runtime/globalContext';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

function setup() {
  const fixture = createSessionRuntimeFixture();
  fixture.runtime.onEvent(() => undefined);
  const open = (sessionId: string) =>
    fixture.emit({
      name: 'openApp',
      params: { sessionId, appName: 'example', scheme: 'granite://host/example/detail' },
    });
  const close = (sessionId: string) => fixture.emit({ name: 'closeApp', params: { sessionId } });
  return { ...fixture, open, close };
}

describe('session pending completion', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
    Reflect.deleteProperty(globalThis, 'hideSharedPendingHostComponent');
  });

  it('preserves completion through another open, global reset, visibility changes and close without hide', () => {
    const { open, close, emit } = setup();
    open('first');
    hidePendingHostComponent();
    open('second');
    resetPendingHostComponent();
    emit({ name: 'sessionVisibilityChanged', params: { sessionId: 'first', isVisible: false } });
    expect(getIsPendingHostComponentHidden('first')).toBe(true);
    expect(getIsPendingHostComponentHidden('second')).toBe(false);
    close('second');
    emit({ name: 'sessionVisibilityChanged', params: { sessionId: 'first', isVisible: true } });
    expect(getIsPendingHostComponentHidden('first')).toBe(true);
    open('first'); // Duplicate delivery must not reset an accepted session.
    expect(getIsPendingHostComponentHidden('first')).toBe(true);
    close('first');
    expect(Reflect.get(getMicroFrontendGlobalContext(), 'pendingHostComponentStore').sessionHidden.size).toBe(0);
    open('first');
    expect(getIsPendingHostComponentHidden('first')).toBe(false);
  });

  it('isolates overlapping unfinished sessions and ignores stale explicit completion after close', () => {
    const { open, close } = setup();
    open('first');
    open('second');
    hidePendingHostComponent('first');
    expect(getIsPendingHostComponentHidden('first')).toBe(true);
    expect(getIsPendingHostComponentHidden('second')).toBe(false);
    expect(getIsPendingHostComponentHidden()).toBe(false);
    close('first');
    hidePendingHostComponent('first');
    expect(getIsPendingHostComponentHidden('second')).toBe(false);
    hidePendingHostComponent();
    expect(getIsPendingHostComponentHidden('second')).toBe(true);
  });

  it('routes legacy bridge completion only to the latest open session', () => {
    const { open } = setup();
    open('first');
    open('second');
    // Simulate an older remote copy updating its shared global flag first.
    Reflect.get(getMicroFrontendGlobalContext(), 'pendingHostComponentStore').hidden = true;
    Reflect.get(globalThis, 'hideSharedPendingHostComponent')();
    expect(getIsPendingHostComponentHidden('first')).toBe(false);
    expect(getIsPendingHostComponentHidden('second')).toBe(true);
  });

  it('adopts older stores and shares session completion across package copies', async () => {
    Reflect.defineProperty(getMicroFrontendGlobalContext(), 'pendingHostComponentStore', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: { entries: [], hidden: false, listeners: new Set(), version: 0 },
    });
    const { open } = setup();
    open('first');
    vi.resetModules();
    const otherCopy = await import('./pendingHostComponentStore');
    otherCopy.hidePendingHostComponent('first');
    expect(getIsPendingHostComponentHidden('first')).toBe(true);
  });

  it('tracks events before React mounts and retains completion through host remounts', () => {
    const fixture = createSessionRuntimeFixture();
    fixture.emit({ name: 'openApp', params: { sessionId: 'first', appName: 'example', scheme: 'granite://example' } });
    fixture.runtime.onEvent(() => undefined);
    hidePendingHostComponent('first');
    let hidden = false;
    function Host({ sessionId }: { sessionId: string }) {
      hidden = useIsPendingHostComponentHidden(sessionId);
      return null;
    }
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<Host sessionId="first" />);
    });
    expect(hidden).toBe(true);
    act(() => {
      renderer.unmount();
    });
    act(() => {
      renderer = create(<Host sessionId="first" />);
    });
    expect(hidden).toBe(true);
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: { sessionId: 'second', appName: 'example', scheme: 'granite://example' },
      });
      renderer.update(<Host sessionId="second" />);
    });
    expect(hidden).toBe(false);
    act(() => {
      hidePendingHostComponent('second');
    });
    expect(hidden).toBe(true);
    act(() => {
      renderer.unmount();
    });
  });
});
