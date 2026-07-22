import { describe, expect, it } from 'vitest';
import { createFlowStripStep } from './createFlowStripStep';

describe('createFlowStripStep', () => {
  it('removes a Flow type-only import from runtime dependencies', async () => {
    // Given
    const source = `
      // @flow strict-local
      import { type NativeResponseType } from './XMLHttpRequest';
      export const responseType: NativeResponseType = 'text';
    `;
    const transform = createFlowStripStep();

    // When
    const result = await transform(
      source,
      { path: '/fixtures/RCTNetworking.ios.js' },
      { key: 'flow-type-only-import', mtimeMs: 0 }
    );

    // Then
    expect(result.code).not.toContain('./XMLHttpRequest');
  });
});
