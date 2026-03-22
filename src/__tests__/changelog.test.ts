import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { addVersionEntry, getLatestVersion, validateChangelog } from '../changelog';
import { createTempProject, writeTextFile } from './test-utils';

describe('changelog', () => {
  it('validates keep a changelog structure and required version entries', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );

    expect(validateChangelog(changelogPath, '1.2.3', true, true)).toEqual({
      valid: true,
      errors: [],
      hasEntryForVersion: true,
    });
  });

  it('returns a missing changelog error when entries are required', () => {
    const cwd = createTempProject();
    const changelogPath = path.join(cwd, 'CHANGELOG.md');

    expect(validateChangelog(changelogPath, '1.2.3', true, true)).toEqual({
      valid: false,
      errors: [`Changelog not found: ${changelogPath}`],
      hasEntryForVersion: false,
    });
  });

  it('allows a missing changelog when entries are optional', () => {
    const cwd = createTempProject();
    const changelogPath = path.join(cwd, 'CHANGELOG.md');

    expect(validateChangelog(changelogPath, '1.2.3', true, false)).toEqual({
      valid: true,
      errors: [],
      hasEntryForVersion: false,
    });
  });

  it('collects structural errors in strict mode', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(cwd, 'CHANGELOG.md', '## [1.0.0] - 2026-03-21\n');

    expect(validateChangelog(changelogPath, '1.2.3', true, true)).toEqual({
      valid: false,
      errors: [
        'Changelog must start with "# Changelog"',
        'Changelog must have an [Unreleased] section',
        'Changelog must have an entry for version 1.2.3',
        'Changelog should include compare links at the bottom',
      ],
      hasEntryForVersion: false,
    });
  });

  it('requires the strict version heading format when the entry exists', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3]\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );

    expect(validateChangelog(changelogPath, '1.2.3', true, true)).toEqual({
      valid: false,
      errors: ['Version 1.2.3 entry must use "## [1.2.3] - YYYY-MM-DD" format'],
      hasEntryForVersion: true,
    });
  });

  it('flags invalid version entry dates in strict mode', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-3-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );

    expect(validateChangelog(changelogPath, '1.2.3', true, true)).toEqual({
      valid: false,
      errors: ['Version 1.2.3 entry date must use YYYY-MM-DD format'],
      hasEntryForVersion: true,
    });
  });

  it('skips strict-only checks when strict mode is disabled', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3]\n\n### Added\n\n- Initial release\n',
    );

    expect(validateChangelog(changelogPath, '1.2.3', false, true)).toEqual({
      valid: true,
      errors: [],
      hasEntryForVersion: true,
    });
  });

  it('does not require a version entry when requireEntry is false', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
    );

    expect(validateChangelog(changelogPath, '1.2.3', true, false)).toEqual({
      valid: true,
      errors: [],
      hasEntryForVersion: false,
    });
  });

  it('returns the latest released version and ignores Unreleased', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [2.0.0] - 2026-03-21\n\n## [1.9.0] - 2026-03-20\n',
    );

    expect(getLatestVersion(changelogPath)).toBe('2.0.0');
  });

  it('returns null when no released version exists', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(cwd, 'CHANGELOG.md', '# Changelog\n\n## [Unreleased]\n');

    expect(getLatestVersion(changelogPath)).toBeNull();
    expect(getLatestVersion(path.join(cwd, 'MISSING.md'))).toBeNull();
  });

  it('adds a missing version entry below unreleased', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
    );

    addVersionEntry(changelogPath, '1.2.3', '2026-03-21');

    expect(fs.readFileSync(changelogPath, 'utf-8')).toBe(
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Describe changes here.\n\n[Unreleased]: https://example.com\n',
    );
    expect(validateChangelog(changelogPath, '1.2.3', false, true).valid).toBe(true);
  });

  it('adds a version entry even when unreleased is followed by content immediately', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n### Added\n\n- Pending work\n',
    );

    addVersionEntry(changelogPath, '1.2.3', '2026-03-21');

    expect(fs.readFileSync(changelogPath, 'utf-8')).toContain(
      '## [Unreleased]\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Describe changes here.\n\n### Added\n\n- Pending work\n',
    );
  });

  it('does nothing when the version entry already exists', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n',
    );
    const before = fs.readFileSync(changelogPath, 'utf-8');

    addVersionEntry(changelogPath, '1.2.3', '2026-03-22');

    expect(fs.readFileSync(changelogPath, 'utf-8')).toBe(before);
  });

  it('throws when adding an entry to a missing changelog', () => {
    const cwd = createTempProject();
    const changelogPath = path.join(cwd, 'CHANGELOG.md');

    expect(() => addVersionEntry(changelogPath, '1.2.3')).toThrow(
      `Changelog not found: ${changelogPath}`,
    );
  });

  it('throws when the changelog has no unreleased section to insert into', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [1.0.0] - 2026-03-21\n',
    );

    expect(() => addVersionEntry(changelogPath, '1.2.3', '2026-03-21')).toThrow(
      'Changelog must have an [Unreleased] section',
    );
  });
});
