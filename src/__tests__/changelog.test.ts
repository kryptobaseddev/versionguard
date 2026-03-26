import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  addVersionEntry,
  fixChangesetMangling,
  getLatestVersion,
  isChangesetMangled,
  validateChangelog,
} from '../changelog';
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

  it('detects Changesets-mangled changelog', () => {
    const cwd = createTempProject();
    const mangled = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## 0.4.0\n\n### Minor Changes\n\n- ec39479: feat: something\n\nAll notable changes...\n\n## [Unreleased]\n\n## [0.3.0] - 2026-03-25\n',
    );

    expect(isChangesetMangled(mangled)).toBe(true);
  });

  it('does not flag properly formatted changelog as mangled', () => {
    const cwd = createTempProject();
    const proper = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [0.4.0] - 2026-03-25\n\n### Added\n\n- Something\n',
    );

    expect(isChangesetMangled(proper)).toBe(false);
  });

  it('fixes Changesets-mangled changelog into Keep a Changelog format', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      [
        '# Changelog',
        '',
        '## 0.4.0',
        '',
        '### Minor Changes',
        '',
        '- ec39479: feat: add new feature',
        '',
        '### Patch Changes',
        '',
        '- 8febca6: fix: fix a bug',
        '',
        'All notable changes to this project will be documented in this file.',
        '',
        '## [Unreleased]',
        '',
        '## [0.3.0] - 2026-03-25',
        '',
        '### Added',
        '',
        '- Previous entry',
        '',
        '[Unreleased]: https://github.com/org/repo/compare/v0.3.0...HEAD',
        '[0.3.0]: https://github.com/org/repo/releases/tag/v0.3.0',
        '',
      ].join('\n'),
    );

    const fixed = fixChangesetMangling(changelogPath, '2026-03-25');
    expect(fixed).toBe(true);

    const result = fs.readFileSync(changelogPath, 'utf-8');

    // Should have proper bracketed header with date
    expect(result).toContain('## [0.4.0] - 2026-03-25');

    // Should have Keep a Changelog section names
    expect(result).toContain('### Added');
    expect(result).toContain('### Fixed');
    expect(result).not.toContain('### Minor Changes');
    expect(result).not.toContain('### Patch Changes');

    // Should strip commit hashes
    expect(result).not.toContain('ec39479');
    expect(result).not.toContain('8febca6');
    expect(result).toContain('- add new feature');
    expect(result).toContain('- fix a bug');

    // Should keep [Unreleased] section
    expect(result).toContain('## [Unreleased]');

    // Should keep previous entries
    expect(result).toContain('## [0.3.0] - 2026-03-25');
    expect(result).toContain('- Previous entry');

    // Should update compare links
    expect(result).toContain('[Unreleased]: https://github.com/org/repo/compare/v0.4.0...HEAD');
    expect(result).toContain('[0.4.0]: https://github.com/org/repo/compare/v0.3.0...v0.4.0');

    // Should now validate
    expect(isChangesetMangled(changelogPath)).toBe(false);
  });

  it('returns false when changelog is not mangled', () => {
    const cwd = createTempProject();
    const changelogPath = writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [0.4.0] - 2026-03-25\n',
    );

    expect(fixChangesetMangling(changelogPath)).toBe(false);
  });

  describe('section structure enforcement', () => {
    const structure = {
      enforceStructure: true,
      sections: ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'],
    };

    it('passes when all sections are allowed Keep a Changelog names', () => {
      const cwd = createTempProject();
      const changelogPath = writeTextFile(
        cwd,
        'CHANGELOG.md',
        '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-03-26\n\n### Added\n\n- Feature A\n\n### Fixed\n\n- Bug B\n\n[Unreleased]: https://example.com\n',
      );

      const result = validateChangelog(changelogPath, '1.0.0', true, true, structure);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects non-standard section names', () => {
      const cwd = createTempProject();
      const changelogPath = writeTextFile(
        cwd,
        'CHANGELOG.md',
        '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-03-26\n\n### Improvements\n\n- Better stuff\n\n[Unreleased]: https://example.com\n',
      );

      const result = validateChangelog(changelogPath, '1.0.0', true, true, structure);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid changelog section "### Improvements"'),
        ]),
      );
    });

    it('detects empty sections', () => {
      const cwd = createTempProject();
      const changelogPath = writeTextFile(
        cwd,
        'CHANGELOG.md',
        '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-03-26\n\n### Added\n\n### Fixed\n\n- Bug B\n\n[Unreleased]: https://example.com\n',
      );

      const result = validateChangelog(changelogPath, '1.0.0', true, true, structure);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Empty changelog section "### Added"')]),
      );
    });

    it('accepts custom section whitelist', () => {
      const cwd = createTempProject();
      const changelogPath = writeTextFile(
        cwd,
        'CHANGELOG.md',
        '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-03-26\n\n### Features\n\n- Feature A\n\n### Bugfixes\n\n- Bug B\n\n[Unreleased]: https://example.com\n',
      );

      const custom = { enforceStructure: true, sections: ['Features', 'Bugfixes'] };
      const result = validateChangelog(changelogPath, '1.0.0', true, true, custom);
      expect(result.valid).toBe(true);
    });

    it('does not enforce sections when enforceStructure is false', () => {
      const cwd = createTempProject();
      const changelogPath = writeTextFile(
        cwd,
        'CHANGELOG.md',
        '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-03-26\n\n### Whatever\n\n- Stuff\n\n[Unreleased]: https://example.com\n',
      );

      const result = validateChangelog(changelogPath, '1.0.0', true, true, {
        enforceStructure: false,
      });
      expect(result.valid).toBe(true);
    });

    it('does not enforce sections when no structure options provided', () => {
      const cwd = createTempProject();
      const changelogPath = writeTextFile(
        cwd,
        'CHANGELOG.md',
        '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-03-26\n\n### Nonsense\n\n- Stuff\n\n[Unreleased]: https://example.com\n',
      );

      const result = validateChangelog(changelogPath, '1.0.0', true, true);
      expect(result.valid).toBe(true);
    });

    it('reports multiple invalid sections in one pass', () => {
      const cwd = createTempProject();
      const changelogPath = writeTextFile(
        cwd,
        'CHANGELOG.md',
        '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-03-26\n\n### Improvements\n\n- A\n\n### Bugfixes\n\n- B\n\n[Unreleased]: https://example.com\n',
      );

      const result = validateChangelog(changelogPath, '1.0.0', true, true, structure);
      expect(result.valid).toBe(false);
      const sectionErrors = result.errors.filter((e) => e.includes('Invalid changelog section'));
      expect(sectionErrors).toHaveLength(2);
    });
  });
});
