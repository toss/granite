import fs from 'fs/promises';
import path from 'path';
import { describe, expect, it } from 'vitest';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

/**
 * The greenfield template is composed as `granite-app` (JS layer) + `greenfield-native` (native overlay).
 * The overlay must stay native-only so the JS layer always comes from the base template.
 * If this test fails, move the file into `templates/granite-app` instead of duplicating it in the overlay.
 */
describe('greenfield-native overlay', () => {
  const overlayDir = path.join(TEMPLATES_DIR, 'greenfield-native');
  const baseDir = path.join(TEMPLATES_DIR, 'granite-app');

  it('contains only native files and explicitly allowed overrides', async () => {
    const allowedRootEntries = [
      'README.md',
      '_gitignore',
      'android',
      'ios',
      'granite.config.ts',
      'package.json',
      'src',
    ];
    const rootEntries = await fs.readdir(overlayDir);
    expect(allowedRootEntries).toEqual(expect.arrayContaining(rootEntries));

    const srcEntries = await fs.readdir(path.join(overlayDir, 'src'));
    expect(srcEntries).toEqual(['_app.tsx']);
  });

  it('does not redeclare dependencies or scripts owned by the base template', async () => {
    const readPackageJson = async (dir: string) =>
      JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf-8'));

    const basePackageJson = await readPackageJson(baseDir);
    const overlayPackageJson = await readPackageJson(overlayDir);

    expect(overlayPackageJson).not.toHaveProperty('name');

    for (const field of ['scripts', 'dependencies', 'devDependencies'] as const) {
      const baseKeys = Object.keys(basePackageJson[field] ?? {});
      const overlayKeys = Object.keys(overlayPackageJson[field] ?? {});
      const duplicatedKeys = overlayKeys.filter((key) => baseKeys.includes(key));

      expect(duplicatedKeys, `${field} must be owned by a single template layer`).toEqual([]);
    }
  });
});
