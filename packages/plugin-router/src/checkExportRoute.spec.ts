import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { checkExportRoute } from './checkExportRoute';

describe('checkExportRoute', () => {
  it('checks export const Route = ... format', async () => {
    const result = checkExportRoute(resolve(__dirname, '..', '__fixtures__/has-variable-export-route.tsx'));
    expect(result).toBe(true);
  });

  it('checks export { Route } format', async () => {
    const result = checkExportRoute(resolve(__dirname, '..', '__fixtures__/has-named-export-route.tsx'));
    expect(result).toBe(true);
  });

  it('no Route in export', async () => {
    const result = checkExportRoute(resolve(__dirname, '..', '__fixtures__/no-export-route.tsx'));
    expect(result).toBe(false);
  });
});
