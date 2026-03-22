import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getDefaultConfig } from '../config';
import { checkHardcodedVersions, syncFile, syncVersion } from '../sync';
import { createTempProject, writeTextFile } from './test-utils';

describe('sync', () => {
  it('updates configured files and detects mismatches', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeTextFile(cwd, 'CHANGELOG.md', '# Changelog\n\n## [0.0.1]\n');

    const config = getDefaultConfig();
    const results = syncVersion('1.2.3', config.sync, cwd);

    expect(results.some((result) => result.updated)).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'README.md'), 'utf-8')).toContain('1.2.3');
    expect(checkHardcodedVersions('1.2.3', config.sync, config.ignore, cwd)).toEqual([]);
  });

  it('handles named capture groups during sync', () => {
    const cwd = createTempProject();
    const filePath = writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');

    const result = syncFile(filePath, '2.0.0', [
      {
        regex: '(version\\s*=\\s*["\'])(?<version>.+?)(["\'])',
        template: '$1{{version}}$3',
      },
    ]);

    expect(result.updated).toBe(true);
    expect(result.changes).toEqual([{ line: 1, oldValue: '0.0.1', newValue: '2.0.0' }]);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('version = "2.0.0"\n');
  });

  it('supports single capture groups and reports unresolved templates without rewriting files', () => {
    const cwd = createTempProject();
    const singleCapturePath = writeTextFile(cwd, 'README.md', 'VERSION=0.0.1\n');

    const singleCapture = syncFile(singleCapturePath, '2.0.0', [
      {
        regex: 'VERSION=(.+)',
        template: 'VERSION={{version}}',
      },
    ]);

    expect(singleCapture.updated).toBe(true);
    expect(singleCapture.changes).toEqual([{ line: 1, oldValue: '0.0.1', newValue: '2.0.0' }]);

    const unresolvedPath = writeTextFile(cwd, 'notes.txt', 'release 0.0.1\n');
    const unresolved = syncFile(unresolvedPath, '2.0.0', [
      {
        regex: 'release 0\\.0\\.1',
        template: '$9',
      },
    ]);

    expect(unresolved.updated).toBe(false);
    expect(unresolved.changes).toEqual([{ line: 1, oldValue: '', newValue: '2.0.0' }]);
    expect(fs.readFileSync(unresolvedPath, 'utf-8')).toBe('release 0.0.1\n');
  });

  it('leaves matching versions and Unreleased entries untouched', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(cwd, 'CHANGELOG.md', '# Changelog\n\n## [Unreleased]\n');

    const config = getDefaultConfig();
    const results = syncVersion('1.2.3', config.sync, cwd);

    expect(results).toEqual([
      { file: path.join(cwd, 'CHANGELOG.md'), updated: false, changes: [] },
      { file: path.join(cwd, 'README.md'), updated: false, changes: [] },
    ]);
  });

  it('reports mismatches with ignore patterns and line numbers', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'intro\nversion = "0.0.1"\n');
    writeTextFile(cwd, 'docs/guide.md', 'version = "0.0.2"\n');

    const mismatches = checkHardcodedVersions(
      '1.2.3',
      {
        files: ['README.md', 'docs/*.md'],
        patterns: [{ regex: '(version\\s*=\\s*["\'])(.+?)(["\'])', template: '$1{{version}}$3' }],
      },
      ['docs/**'],
      cwd,
    );

    expect(mismatches).toEqual([{ file: 'README.md', line: 2, found: '0.0.1' }]);
  });
});
