import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getDefaultConfig } from '../config';
import { fixAll, fixChangelog, fixPackageVersion, fixSyncIssues, suggestNextVersion } from '../fix';
import { createTempProject, writeTextFile } from './test-utils';

describe('fix helpers', () => {
  it('updates package versions when needed', () => {
    const cwd = createTempProject();

    expect(fixPackageVersion('1.2.4', cwd).fixed).toBe(true);
    expect(fixPackageVersion('1.2.4', cwd).fixed).toBe(false);
  });

  it('reports missing package manifests', () => {
    const cwd = createTempProject();
    fs.unlinkSync(path.join(cwd, 'package.json'));

    expect(fixPackageVersion('1.2.4', cwd)).toEqual({
      fixed: false,
      message: 'package.json not found',
    });
  });

  it('reports package updates when package.json has no existing version', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'package.json', `${JSON.stringify({ name: 'fixture' }, null, 2)}\n`);

    expect(fixPackageVersion('1.0.0', cwd)).toMatchObject({
      fixed: true,
      message: 'Updated package.json from undefined to 1.0.0',
    });
  });

  it('creates and updates changelog entries', () => {
    const cwd = createTempProject();
    const config = getDefaultConfig();

    const created = fixChangelog('1.2.3', config, cwd);
    expect(created.fixed).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'CHANGELOG.md'), 'utf-8')).toContain('## [1.2.3]');

    const existing = fixChangelog('1.2.3', config, cwd);
    expect(existing.fixed).toBe(false);
  });

  it('fixes synced files and aggregates all fixes', () => {
    const cwd = createTempProject();
    const config = getDefaultConfig();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
    );

    const syncResults = fixSyncIssues(config, cwd);
    expect(syncResults.some((result) => result.fixed)).toBe(true);

    const allResults = fixAll(config, '1.2.4', cwd);
    expect(allResults.some((result) => result.message.includes('Updated package.json'))).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')).toContain('1.2.4');
  });

  it('suggests next semver and calver releases', () => {
    const config = getDefaultConfig();
    expect(suggestNextVersion('1.2.3', config).map((item) => item.version)).toEqual([
      '1.2.4',
      '1.3.0',
      '2.0.0',
    ]);

    config.versioning.type = 'calver';
    const suggestions = suggestNextVersion('2026.3.1', config);
    expect(suggestions).toHaveLength(2);
  });

  it('filters semver suggestions by requested change type and validates calver config presence', () => {
    const config = getDefaultConfig();

    expect(suggestNextVersion('1.2.3', config, 'patch')).toEqual([
      { version: '1.2.4', reason: 'Patch - bug fixes, small changes' },
    ]);
    expect(suggestNextVersion('1.2.3', config, 'minor')).toEqual([
      { version: '1.3.0', reason: 'Minor - new features, backwards compatible' },
    ]);
    expect(suggestNextVersion('1.2.3', config, 'major')).toEqual([
      { version: '2.0.0', reason: 'Major - breaking changes' },
    ]);

    config.versioning.type = 'calver';
    delete config.versioning.calver;

    expect(() => suggestNextVersion('2026.3.1', config)).toThrow(
      'CalVer configuration is required',
    );
  });
});
