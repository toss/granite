import { describe, expect, it } from 'vitest';
import { InvalidAppRequestError } from './errors';
import { parseAppRequest } from './parseAppRequest';

describe('parseAppRequest', () => {
  it('normalizes an app/module request to an exposed module key', () => {
    expect(parseAppRequest('cart/App')).toEqual({
      appName: 'cart',
      exposedModule: './App',
    });
    expect(parseAppRequest('cart/./features/Product')).toEqual({
      appName: 'cart',
      exposedModule: './features/Product',
    });
  });

  it.each(['/App', 'cart/'] as const)('rejects an incomplete request: %s', (request) => {
    expect(() => parseAppRequest(request)).toThrow(InvalidAppRequestError);
  });
});
