import { describe, expect, it } from 'vitest';
import { getDefaultOutfileName } from '../getDefaultOutfileName';

describe('getDefaultOutfileName', () => {
  it('should return the default outfile', () => {
    expect(getDefaultOutfileName('src/index.tsx', 'android')).toBe('index.android.js');
    expect(getDefaultOutfileName('src/index.tsx', 'ios')).toBe('index.ios.js');
    expect(getDefaultOutfileName('src/entry.ts', 'android')).toBe('entry.android.js');
    expect(getDefaultOutfileName('src/entry.ts', 'ios')).toBe('entry.ios.js');
  });
});
