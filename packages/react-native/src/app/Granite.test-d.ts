import { assertType, describe, it } from 'vitest';
import type { GraniteProps } from '../core';

describe('router-independent registration', () => {
  it('accepts only app registration options', () => {
    assertType<GraniteProps>({ appName: 'example' });
    // @ts-expect-error Router configuration belongs on the Router component.
    assertType<GraniteProps>({ appName: 'example', router: {} });
    // @ts-expect-error Route discovery belongs to Router.
    assertType<GraniteProps>({ appName: 'example', context: {} });
    // @ts-expect-error Initial URL resolution belongs to Router or the app.
    assertType<GraniteProps>({ appName: 'example', initialScheme: 'example://app' });
  });
});
