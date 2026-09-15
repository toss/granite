import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const cliManifestPath = require.resolve('@changesets/cli/package.json');
const cliManifest = JSON.parse(readFileSync(cliManifestPath, 'utf8'));
const cli = path.resolve(path.dirname(cliManifestPath), cliManifest.bin.changeset);
const rootManifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageFiles = [
  ...globSync(
    rootManifest.workspaces.map((workspace) => `${workspace}/package.json`),
    { cwd: root }
  ),
];
const manifests = packageFiles.map((file) => JSON.parse(readFileSync(path.join(root, file), 'utf8')));
const currentVersion = manifests.find((pkg) => pkg.name === '@granite-js/react-native').version;
assert.match(currentVersion, /^\d+\.\d+\.\d+$/);
const [major, minor, patch] = currentVersion.split('.').map(Number);
const publicNames = new Set(manifests.filter((pkg) => !pkg.private).map((pkg) => pkg.name));

for (const [type, expected] of [
  ['patch', `${major}.${minor}.${patch + 1}`],
  ['minor', `${major}.${minor + 1}.0`],
  ['major', `${major + 1}.0.0`],
]) {
  test(`a ${type} changeset preserves the intended release level`, () => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'granite-release-plan-'));
    try {
      for (const file of ['package.json', 'yarn.lock', '.changeset/config.json', ...packageFiles]) {
        const target = path.join(fixture, file);
        mkdirSync(path.dirname(target), { recursive: true });
        copyFileSync(path.join(root, file), target);
      }
      writeFileSync(
        path.join(fixture, '.changeset/release-policy.md'),
        `---\n'@granite-js/react-native': ${type}\n---\n\nCheck the release level.\n`
      );
      const config = JSON.parse(readFileSync(path.join(fixture, '.changeset/config.json'), 'utf8'));
      execFileSync('git', ['init', '--quiet', '--initial-branch', config.baseBranch], { cwd: fixture });
      execFileSync(
        'git',
        [
          '-c',
          'user.name=Release Test',
          '-c',
          'user.email=release-test@example.com',
          '-c',
          'commit.gpgsign=false',
          '-c',
          'core.hooksPath=/dev/null',
          'commit',
          '--quiet',
          '--allow-empty',
          '-m',
          'Initialize release fixture',
        ],
        { cwd: fixture }
      );
      execFileSync(process.execPath, [cli, 'status', '--output=release-plan.json'], {
        cwd: fixture,
        env: { ...process.env, CI: 'true' },
        encoding: 'utf8',
        stdio: 'pipe',
      });
      const plan = JSON.parse(readFileSync(path.join(fixture, 'release-plan.json'), 'utf8'));
      const releases = plan.releases.filter((release) => release.type !== 'none' && publicNames.has(release.name));
      assert.ok(releases.some((release) => release.name === '@granite-js/react-native'));
      for (const release of releases) {
        assert.equal(release.newVersion, expected, `${release.name} should receive a ${type} release`);
      }
    } finally {
      rmSync(fixture, { recursive: true });
    }
  });
}
