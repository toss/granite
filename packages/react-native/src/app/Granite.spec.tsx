import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Granite, useInitialProps, type InitialProps } from '../core';
import { useVisibilityChanged } from '../visibility/useVisibilityChanged';

vi.mock('@granite-js/native/@react-navigation/native', () => {
  throw new Error('The registration core must not import React Navigation');
});
vi.mock('@granite-js/brownfield-module', () => ({
  GraniteBrownfieldModule: {
    onVisibilityChanged: () => ({ remove: () => undefined }),
    getSchemeUri: () => {
      throw new Error('Registration must not resolve the entry URL');
    },
  },
}));
vi.mock('../polyfills', () => ({ setupPolyfills: () => undefined }));

afterEach(cleanup);

function Content(props: InitialProps) {
  const initialProps = useInitialProps();
  const visible = useVisibilityChanged();
  return (
    <div>
      {props.scheme}:{initialProps.initialColorPreference}:{String(visible)}
    </div>
  );
}

describe('Granite.registerApp without routing', () => {
  it('renders the app directly and supplies initial props without a route context or URL lookup', () => {
    const Root = Granite.registerApp(Content, { appName: 'plain-app' });
    render(<Root platform="android" initialColorPreference="dark" scheme="example://entry" />);
    expect(screen.getByText('example://entry:dark:true')).toBeDefined();
  });

  it('preserves presentation visibility inside the registered app', () => {
    const Root = Granite.registerApp(Content, { appName: 'hidden-app' });
    const view = render(<Root platform="android" initialColorPreference="light" presentationVisibility={false} />);
    expect(screen.getByText(':light:false')).toBeDefined();
    view.rerender(<Root platform="android" initialColorPreference="light" presentationVisibility={true} />);
    expect(screen.getByText(':light:true')).toBeDefined();
  });

  it('keeps initial props and visibility local to each registered app', () => {
    const First = Granite.registerApp(Content, { appName: 'first-app' });
    const Second = Granite.registerApp(Content, { appName: 'second-app' });
    render(
      <>
        <First platform="android" initialColorPreference="dark" scheme="first" presentationVisibility={false} />
        <Second platform="android" initialColorPreference="light" scheme="second" />
      </>
    );
    expect(screen.getByText('first:dark:false')).toBeDefined();
    expect(screen.getByText('second:light:true')).toBeDefined();
  });

  it('rejects old registration options with migration guidance for untyped callers', () => {
    expect(() => Granite.registerApp(Content, { appName: 'old-app', router: {} } as any)).toThrow('Render Router');
  });
});
