import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import Portal from '../specs/PortalViewNativeComponent';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

describe('Portal', () => {
  it('renders a native PortalView for the requested host', async () => {
    const child = 'Store service';
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(<Portal hostName="store">{child}</Portal>);
    });
    if (renderer == null) {
      throw new Error('The Portal renderer was not created');
    }

    expect(renderer.toJSON()).toMatchObject({
      props: { hostName: 'store' },
      type: 'PortalView',
    });
  });
});
