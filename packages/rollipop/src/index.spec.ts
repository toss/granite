import { describe, expect, it } from 'vitest';
import manifest from '../package.json';
import * as adapter from './index';

describe('public adapter boundaries', () => {
  it('exports only the bundler adapter', () => {
    expect(Object.keys(adapter)).toEqual(['rollipop']);
    expect(manifest.dependencies).not.toHaveProperty('@granite-js/plugin-core');
  });
});
