import { render } from '@testing-library/react';
import { BackHandler } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceSessionBackGuard, ServiceSessionProvider, useServiceSession } from './ServiceSessionContext';

function SessionConsumer() {
  const session = useServiceSession();
  return <span>{session?.identifier ?? 'none'}</span>;
}

describe('ServiceSessionContext', () => {
  beforeEach(() => {
    vi.mocked(BackHandler.addEventListener).mockClear();
  });

  it('only registers the visible service session as the Android back owner', () => {
    const onBack = vi.fn();

    const { rerender } = render(
      <ServiceSessionProvider identifier="showcase:1" isVisible={false} close={vi.fn()}>
        <ServiceSessionBackGuard onBack={onBack} />
      </ServiceSessionProvider>
    );

    expect(BackHandler.addEventListener).not.toHaveBeenCalled();

    rerender(
      <ServiceSessionProvider identifier="showcase:1" isVisible close={vi.fn()}>
        <ServiceSessionBackGuard onBack={onBack} />
      </ServiceSessionProvider>
    );

    const handler = vi.mocked(BackHandler.addEventListener).mock.calls[0]?.[1];
    expect(handler?.()).toBe(true);
    expect(onBack).toHaveBeenCalledWith({ source: 'androidHardwareBackPress' });
  });

  it('provides the Activity session identity to the nested Granite root', () => {
    const { getByText } = render(
      <ServiceSessionProvider identifier="bare:2" isVisible close={vi.fn()}>
        <SessionConsumer />
      </ServiceSessionProvider>
    );

    expect(getByText('bare:2')).toBeTruthy();
  });
});
