import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { type MicroFrontendSession, useMicroFrontendSession } from './MicroFrontendSessionContext';
import { type MicroFrontendAppProps, MicroFrontendSessionRenderer } from './MicroFrontendSessionRenderer';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

describe('MicroFrontendSessionRenderer', () => {
  it('renders a remote app that only declares its existing scheme prop', async () => {
    // Given
    const close = vi.fn(async () => undefined);
    let receivedScheme: string | null = null;

    function App({ scheme }: { readonly scheme: string }) {
      receivedScheme = scheme;
      return null;
    }

    // When
    await act(async () => {
      create(
        <MicroFrontendSessionRenderer
          app={App}
          sessionId="session-1"
          scheme="granite://cart"
          isVisible={true}
          close={close}
        />
      );
    });

    // Then
    expect(receivedScheme).toBe('granite://cart');
  });

  it('injects session visibility into the Granite app without exposing it through the session hook', async () => {
    // Given
    const close = vi.fn(async () => undefined);
    let receivedAppProps: MicroFrontendAppProps | null = null;
    let receivedSession: MicroFrontendSession | null = null;

    function Consumer() {
      receivedSession = useMicroFrontendSession();
      return null;
    }

    function App(props: MicroFrontendAppProps) {
      receivedAppProps = props;
      return <Consumer />;
    }

    // When
    await act(async () => {
      create(
        <MicroFrontendSessionRenderer
          app={App}
          sessionId="session-1"
          scheme="granite://cart"
          isVisible={false}
          close={close}
        />
      );
    });

    // Then
    expect(receivedAppProps).toEqual({
      scheme: 'granite://cart',
      presentationVisibility: false,
    });
    expect(receivedSession).toEqual({
      sessionId: 'session-1',
      close,
    });
  });

  it('updates the Granite app when session presentation visibility changes', async () => {
    // Given
    const close = vi.fn(async () => undefined);
    let receivedAppProps: MicroFrontendAppProps | null = null;
    let renderer: ReactTestRenderer | undefined;

    function App(props: MicroFrontendAppProps) {
      receivedAppProps = props;
      return null;
    }

    await act(async () => {
      renderer = create(
        <MicroFrontendSessionRenderer
          app={App}
          sessionId="session-1"
          scheme="granite://cart"
          isVisible={false}
          close={close}
        />
      );
    });
    if (renderer == null) {
      throw new Error('The session renderer was not created');
    }
    const mountedRenderer = renderer;

    // When
    await act(async () => {
      mountedRenderer.update(
        <MicroFrontendSessionRenderer
          app={App}
          sessionId="session-1"
          scheme="granite://cart"
          isVisible={true}
          close={close}
        />
      );
    });

    // Then
    expect(receivedAppProps).toEqual({
      scheme: 'granite://cart',
      presentationVisibility: true,
    });
  });
});
