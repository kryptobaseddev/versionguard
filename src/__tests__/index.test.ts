import { describe, expect, it, vi } from 'vitest';

import * as calver from '../calver';

import { getDefaultConfig } from '../config';
import { installHooks } from '../hooks';
import { canBump, doctor, sync, validate, validateVersion } from '../index';
import { createTempProject, initGitRepo, writeTextFile } from './test-utils';

describe('core validation', () => {
  it('validates a healthy semver project', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );

    expect((await validate(getDefaultConfig(), cwd)).valid).toBe(true);
  });

  it('checks bump progression rules', () => {
    const config = getDefaultConfig();
    expect(canBump('1.2.3', '1.2.4', config).canBump).toBe(true);
    expect(canBump('1.2.3', '1.2.3', config).canBump).toBe(false);
  });

  it('reports validation errors for invalid versions and missing package metadata', async () => {
    const config = getDefaultConfig();
    const cwd = createTempProject();
    writeTextFile(cwd, 'package.json', '{\n  "name": "fixture"\n}\n');

    expect(await validate(config, cwd)).toMatchObject({
      valid: false,
      version: '',
      versionValid: false,
      syncValid: false,
      changelogValid: false,
      errors: ['No version field in package.json'],
    });

    expect(canBump('bad', '1.2.3', config)).toEqual({
      canBump: false,
      error: 'Current version is invalid: bad',
    });
    expect(canBump('1.2.3', 'bad', config)).toEqual({
      canBump: false,
      error: 'New version is invalid: bad',
    });

    const invalidVersionCwd = createTempProject();
    writeTextFile(
      invalidVersionCwd,
      'package.json',
      '{\n  "name": "fixture",\n  "version": "v1.2.3"\n}\n',
    );
    writeTextFile(invalidVersionCwd, 'README.md', 'version = "v1.2.3"\n');

    expect((await validate(config, invalidVersionCwd)).errors).toContain(
      "Version should not start with 'v': v1.2.3",
    );
  });

  it('reports invalid projects and doctor readiness', async () => {
    const cwd = createTempProject();
    const config = getDefaultConfig();
    initGitRepo(cwd);
    installHooks(config.git, cwd);
    writeTextFile(cwd, 'README.md', 'version = "1.2.2"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
    );

    const validation = await validate(config, cwd);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error: string) => error.includes('Version mismatch'))).toBe(
      true,
    );

    const report = await doctor(config, cwd);
    expect(report.ready).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('syncs files and validates explicit calver rules', () => {
    const cwd = createTempProject();
    const config = getDefaultConfig();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );

    sync(config, cwd);
    expect(validateVersion('1.2.3', config).valid).toBe(true);

    config.versioning.type = 'calver';
    expect(canBump('2026.3.1', '2026.3.2', config).canBump).toBe(true);
    expect(canBump('2026.3.2', '2026.3.1', config).canBump).toBe(false);
  });

  it('supports changelog-disabled validation and non-git doctor runs', async () => {
    const cwd = createTempProject();
    const config = getDefaultConfig();
    config.changelog.enabled = false;
    config.scan.enabled = false;
    config.guard.enabled = false;
    config.publish.enabled = false;
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');

    expect(await validate(config, cwd)).toMatchObject({
      valid: true,
      version: '1.2.3',
      changelogValid: true,
    });

    expect(await doctor(config, cwd)).toMatchObject({
      ready: true,
      version: '1.2.3',
      versionValid: true,
      syncValid: true,
      changelogValid: true,
      scanValid: true,
      guardValid: true,
      publishValid: true,
      gitRepository: false,
      hooksInstalled: false,
      worktreeClean: true,
    });
  });

  it('reports hook and worktree problems separately in doctor', async () => {
    const cwd = createTempProject();
    const config = getDefaultConfig();
    config.publish.enabled = false;
    initGitRepo(cwd);
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );

    let report = await doctor(config, cwd);
    expect(report.errors).toContain('Git hooks are not installed');

    installHooks(config.git, cwd);
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\nupdated\n');
    report = await doctor(config, cwd);
    expect(report.errors).toContain('Working tree is not clean');

    config.git.enforceHooks = false;
    report = await doctor(config, cwd);
    expect(report.errors).not.toContain('Git hooks are not installed');
  });

  it('surfaces calver configuration and parsing failures', () => {
    const config = getDefaultConfig();
    config.versioning.type = 'calver';
    config.versioning.calver = undefined;

    expect(() => validateVersion('2026.3.1', config)).toThrow(
      'CalVer configuration is required when versioning.type is "calver"',
    );

    const calverConfig = getDefaultConfig();
    calverConfig.versioning.type = 'calver';
    const parseSpy = vi.spyOn(calver, 'parse').mockReturnValueOnce(null).mockReturnValueOnce(null);

    expect(canBump('2026.3.1', '2026.3.2', calverConfig)).toEqual({
      canBump: false,
      error: 'Failed to parse CalVer versions',
    });

    parseSpy.mockRestore();
  });

  it('returns an unclean worktree when git status fails', async () => {
    const cwd = createTempProject();
    const config = getDefaultConfig();
    config.publish.enabled = false;
    initGitRepo(cwd);
    installHooks(config.git, cwd);
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );

    vi.resetModules();
    vi.doMock('node:child_process', () => ({
      execSync: vi.fn(() => {
        throw new Error('git failed');
      }),
      execFileSync: vi.fn(() => {
        throw new Error('git failed');
      }),
    }));

    const { doctor: mockedDoctor } = await import('../index');
    const report = await mockedDoctor(config, cwd);

    expect(report.worktreeClean).toBe(false);
    expect(report.errors).toContain('Working tree is not clean');

    vi.doUnmock('node:child_process');
    vi.resetModules();
  });
});
