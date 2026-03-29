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

  it('syncs only the top-level version in JSON files, not nested keys', () => {
    const cwd = createTempProject();
    const jsonContent = JSON.stringify(
      {
        name: 'test-pkg',
        version: '0.0.1',
        scripts: {
          version: 'node scripts/version.js',
          build: 'tsc',
        },
      },
      null,
      2,
    );
    const filePath = writeTextFile(cwd, 'other.json', jsonContent);

    const result = syncFile(filePath, '2.0.0', getDefaultConfig().sync.patterns);

    expect(result.updated).toBe(true);
    expect(result.changes).toEqual([{ line: 3, oldValue: '0.0.1', newValue: '2.0.0' }]);
    const updated = fs.readFileSync(filePath, 'utf-8');
    expect(updated).toContain('"version": "2.0.0"');
    expect(updated).toContain('"version": "node scripts/version.js"');
  });

  it('leaves JSON files without a version field unchanged', () => {
    const cwd = createTempProject();
    const jsonContent = JSON.stringify({ name: 'no-version', scripts: {} }, null, 2);
    const filePath = writeTextFile(cwd, 'config.json', jsonContent);

    const result = syncFile(filePath, '2.0.0', getDefaultConfig().sync.patterns);

    expect(result.updated).toBe(false);
    expect(result.changes).toEqual([]);
  });

  it('does not match dotted version keys in non-JSON files', () => {
    const cwd = createTempProject();
    const filePath = writeTextFile(cwd, 'config.yml', 'app.version = "0.0.1"\nversion = "0.0.1"\n');

    const result = syncFile(filePath, '2.0.0', getDefaultConfig().sync.patterns);

    expect(result.updated).toBe(true);
    const updated = fs.readFileSync(filePath, 'utf-8');
    expect(updated).toContain('app.version = "0.0.1"');
    expect(updated).toContain('version = "2.0.0"');
  });

  it('reports only top-level version mismatches in JSON files', () => {
    const cwd = createTempProject();
    writeTextFile(
      cwd,
      'pkg.json',
      JSON.stringify({ version: '0.0.1', scripts: { version: 'echo hello' } }, null, 2),
    );

    const mismatches = checkHardcodedVersions(
      '1.2.3',
      { files: ['pkg.json'], patterns: getDefaultConfig().sync.patterns },
      [],
      cwd,
    );

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.found).toBe('0.0.1');
  });
});
