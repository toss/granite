import { render } from '@testing-library/react';
import React from 'react';
import { Platform, UIManager } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

const rendered = vi.hoisted(() => ({ svgProps: [] as Record<string, unknown>[] }));

vi.mock('@granite-js/native/react-native-svg', () => ({
  SvgXml: (props: Record<string, unknown>) => {
    rendered.svgProps.push(props);
    return null;
  },
}));

async function renderBackButton(
  os: 'ios' | 'android',
  version: string | number,
  { hasBackButtonView = true }: { hasBackButtonView?: boolean } = {}
) {
  vi.spyOn(Platform, 'OS', 'get').mockReturnValue(os);
  vi.spyOn(Platform, 'Version', 'get').mockReturnValue(version);
  vi.spyOn(Platform, 'select').mockImplementation((spec: Record<string, unknown>) =>
    os in spec ? spec[os] : spec.default
  );
  // Hosts with @granite-js/screen register GraniteBackButtonView. App versions from before the view do not.
  vi.spyOn(UIManager, 'hasViewManagerConfig').mockImplementation(
    (name: string) => name === 'GraniteBackButtonView' && hasBackButtonView
  );
  // BackButton reads Platform when the module is evaluated, so load it again for each case.
  vi.doMock('react', () => React);
  vi.resetModules();
  const { BackButton } = await import('./BackButton');

  const { container } = render(<BackButton tintColor="#123456" onPress={() => {}} />);

  return { html: container.innerHTML, svg: rendered.svgProps.at(-1) };
}

describe('BackButton', () => {
  afterEach(() => {
    rendered.svgProps = [];
    vi.restoreAllMocks();
  });

  it('marks the iOS button with a stable nativeID and aligns the arrow with the native back button', async () => {
    const { html, svg } = await renderBackButton('ios', '26.5');

    expect(html).toContain('nativeid="granite.header.backButton"');
    expect(svg?.style).toEqual({ marginLeft: -4.33 });
    expect(svg?.xml).toContain('fill="#123456"');
  });

  it('wraps the iOS button in GraniteBackButtonView so a host can find it by its view class', async () => {
    const { html } = await renderBackButton('ios', '26.5');

    // The view holds only the button, which keeps its nativeID.
    expect(html).toMatch(/^<granitebackbuttonview><[a-z]+ [^>]*nativeid="granite\.header\.backButton"/);
    expect(html).toMatch(/<\/granitebackbuttonview>$/);
  });

  it('renders the iOS button as is when the host has not registered GraniteBackButtonView', async () => {
    const { html, svg } = await renderBackButton('ios', '26.5', { hasBackButtonView: false });

    expect(html).not.toContain('granitebackbuttonview');
    expect(html).toMatch(/^<[a-z]+ [^>]*nativeid="granite\.header\.backButton"/);
    expect(svg?.style).toEqual({ marginLeft: -4.33 });
  });

  it('aligns the arrow with the Liquid Glass native back button from iOS 27', async () => {
    const { html, svg } = await renderBackButton('ios', '27.0');

    expect(html).toContain('nativeid="granite.header.backButton"');
    expect(svg?.style).toEqual({ marginLeft: -18.33 });
  });

  it('keeps the Android button unchanged', async () => {
    // Android reports its API level, which is above the iOS version that switches to Liquid Glass.
    const { html, svg } = await renderBackButton('android', 35);

    expect(html).toContain('accessibilitylabel="Go back"');
    expect(html).not.toContain('nativeid');
    expect(html).not.toContain('granitebackbuttonview');
    expect(svg?.style).toEqual({ marginLeft: 0 });
    expect(svg?.xml).toContain('fill-rule="evenodd"');
    expect(svg?.xml).toContain('fill="#123456"');
  });
});
