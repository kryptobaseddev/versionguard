import { existsSync, readFileSync, renameSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { findConfig, getConfig, getDefaultConfig, initConfig, loadConfig } from '../config';
import { createTempProject, writeTextFile } from './test-utils';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

describe('config', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns isolated default config clones', () => {
    const first = getDefaultConfig();
    const second = getDefaultConfig();

    first.sync.files.push('docs/version.md');
    first.git.hooks['pre-commit'] = false;

    expect(second.sync.files).toEqual(['README.md', 'CHANGELOG.md']);
    expect(second.git.hooks['pre-commit']).toBe(true);
  });

  it('finds the highest-priority supported config file', () => {
    const cwd = createTempProject();
    const yamlPath = writeTextFile(cwd, '.versionguard.yaml', 'versioning:\n  type: calver\n');
    writeTextFile(cwd, 'versionguard.yml', 'versioning:\n  type: semver\n');

    expect(findConfig(cwd)).toBe(yamlPath);
  });

  it('loads partial config files and merges defaults', () => {
    const cwd = createTempProject();
    writeTextFile(
      cwd,
      '.versionguard.yml',
      [
        'versioning:',
        '  type: calver',
        '  calver:',
        '    format: YYYY.MM.DD',
        'sync:',
        '  files:',
        '    - docs/version.md',
        'git:',
        '  enforceHooks: false',
        '',
      ].join('\n'),
    );

    expect(getConfig(cwd)).toMatchObject({
      versioning: {
        type: 'calver',
        calver: {
          format: 'YYYY.MM.DD',
          preventFutureDates: true,
        },
      },
      sync: {
        files: ['docs/version.md'],
      },
      changelog: {
        enabled: true,
        file: 'CHANGELOG.md',
      },
      git: {
        enforceHooks: false,
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
      },
    });
  });

  it('falls back to defaults when no config file exists', () => {
    const cwd = createTempProject();

    expect(getConfig(cwd)).toEqual(getDefaultConfig());
  });

  it('rejects non-object yaml config payloads', () => {
    const cwd = createTempProject();
    const configPath = writeTextFile(cwd, '.versionguard.yml', '- not\n- an\n- object\n');

    expect(() => loadConfig(configPath)).toThrow(
      `Config file must contain a YAML object: ${configPath}`,
    );
  });

  it('treats empty yaml documents as the default config', () => {
    const cwd = createTempProject();
    const configPath = writeTextFile(cwd, '.versionguard.yml', '');

    expect(loadConfig(configPath)).toEqual(getDefaultConfig());
  });

  it('preserves explicit null sections from yaml overrides', () => {
    const cwd = createTempProject();
    const configPath = writeTextFile(cwd, '.versionguard.yml', 'sync:\n');

    expect(loadConfig(configPath)).toMatchObject({ sync: null });
  });

  it('refuses to initialize when any supported config filename already exists', () => {
    const cwd = createTempProject();
    const existingPath = writeTextFile(cwd, 'versionguard.yaml', 'versioning:\n  type: semver\n');

    expect(() => initConfig(cwd)).toThrow(`Config file already exists: ${existingPath}`);
  });

  it('initializes config from the example template', () => {
    const cwd = createTempProject();
    const configPath = initConfig(cwd);

    expect(configPath).toBe(path.join(cwd, '.versionguard.yml'));
    expect(loadConfig(configPath)).toMatchObject({
      versioning: { type: 'semver' },
      changelog: { enabled: true },
    });
  });

  it('falls back to the generated template when the example file is unavailable', () => {
    const cwd = createTempProject();
    const examplePath = path.resolve(MODULE_DIR, '..', '..', '.versionguard.yml.example');
    const backupPath = `${examplePath}.bak-test`;

    if (!existsSync(examplePath)) {
      // Example file not present (e.g. running from installed package) — initConfig
      // should fall back to the generated template without needing to rename anything.
      const configPath = initConfig(cwd);
      const content = readFileSync(configPath, 'utf-8');

      expect(content).toContain('# VersionGuard Configuration');
      expect(content).toContain('versioning:');
      expect(content).toContain('ignore:');
      return;
    }

    try {
      renameSync(examplePath, backupPath);

      const configPath = initConfig(cwd);
      const content = readFileSync(configPath, 'utf-8');

      expect(content).toContain('# VersionGuard Configuration');
      expect(content).toContain('versioning:');
      expect(content).toContain('ignore:');
    } finally {
      renameSync(backupPath, examplePath);
    }
  });
});
