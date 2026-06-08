import { vi } from 'vitest';

export const GraniteBrownfieldModule = {
  closeView: vi.fn(),
  getConstants: vi.fn(() => ({ schemeUri: '' })),
  getSchemeUri: vi.fn(() => ''),
  onVisibilityChanged: vi.fn(),
};
