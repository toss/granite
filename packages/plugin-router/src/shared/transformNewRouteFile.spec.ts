import { describe, it, expect } from 'vitest';
import { transformNewLayoutFile, transformNewRouteFile } from './transformNewRouteFile';

describe('transformNewRouteFile', () => {
  it('creates pages/index.tsx file', async () => {
    const result = await transformNewRouteFile('pages/index.tsx');
    expect(result).toMatch("export const Route = createRoute('/'");
  });

  it('creates pages/about.tsx file', async () => {
    const result = await transformNewRouteFile('pages/about.tsx');
    expect(result).toMatch("export const Route = createRoute('/about'");
  });

  it('creates pages/about/index.tsx file', async () => {
    const result = await transformNewRouteFile('pages/about/index.tsx');
    expect(result).toMatch("export const Route = createRoute('/about'");
  });
});

describe('transformNewLayoutFile', () => {
  it('creates pages/_layout.tsx file', async () => {
    const result = await transformNewLayoutFile('pages/_layout.tsx');
    expect(result).toMatch('export default function Layout');
  });

  it('creates pages/about/_layout.tsx file', async () => {
    const result = await transformNewLayoutFile('pages/about/_layout.tsx');
    expect(result).toMatch('export default function AboutLayout');
  });
});
