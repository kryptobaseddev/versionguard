import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProgram, runCli, shouldRunCli } from '../cli';
import * as fixModule from '../fix';
import { installHooks } from '../hooks';
import * as indexModule from '../index';
import { createTempProject, initGitRepo, writeTextFile } from './test-utils';

describe('cli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function failOnExit() {
    return vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);
  }

  function releaseChangelog(version: string = '1.2.3'): string {
    return [
      '# Changelog',
      '',
      '## [Unreleased]',
      '',
      `## [${version}] - 2026-03-21`,
      '',
      '### Added',
      '',
      '- Initial release',
      '',
      '[Unreleased]: https://example.com',
      '',
    ].join('\n');
  }

  function makeHealthyProject(cwd: string): void {
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(cwd, 'CHANGELOG.md', releaseChangelog());
  }

  it('initializes config files via the init command (headless)', async () => {
    const cwd = createTempProject();
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'init', '--cwd', cwd, '--yes']);

    expect(fs.existsSync(path.join(cwd, '.versionguard.yml'))).toBe(true);
    expect(logSpy).toHaveBeenCalled();
  });

  it('initializes with calver flags (headless)', async () => {
    const cwd = createTempProject();
    const program = createProgram();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync([
      'node',
      'versionguard',
      'init',
      '--cwd',
      cwd,
      '--type',
      'calver',
      '--format',
      'YYYY.M.MICRO',
    ]);

    const content = fs.readFileSync(path.join(cwd, '.versionguard.yml'), 'utf-8');
    expect(content).toContain('calver');
    expect(content).toContain('YYYY.M.MICRO');
  });

  it('initializes with manifest flag (headless)', async () => {
    const cwd = createTempProject();
    const program = createProgram();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync([
      'node',
      'versionguard',
      'init',
      '--cwd',
      cwd,
      '--manifest',
      'Cargo.toml',
      '--yes',
    ]);

    const content = fs.readFileSync(path.join(cwd, '.versionguard.yml'), 'utf-8');
    expect(content).toContain('Cargo.toml');
  });

  it('reports init errors when config already exists', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, '.versionguard.yml', 'versioning:\n  type: semver\n');
    const program = createProgram();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'init', '--cwd', cwd, '--type', 'semver']),
    ).rejects.toThrow('process.exit:1');

    expect(errorSpy.mock.calls.flat().join('\n')).toContain('already exists');
  });

  it('installs git hooks from the hooks command', async () => {
    const cwd = createTempProject();
    initGitRepo(cwd);
    const program = createProgram();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'hooks', 'install', '--cwd', cwd]);

    expect(fs.existsSync(path.join(cwd, '.git/hooks/pre-commit'))).toBe(true);
  });

  it('reports hook install errors outside git repositories', async () => {
    const cwd = createTempProject();
    const program = createProgram();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'hooks', 'install', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    expect(errorSpy.mock.calls.flat().join('\n')).toContain('Not a git repository');
  });

  it('runs check successfully for a valid project', async () => {
    const cwd = createTempProject();
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'check', '--cwd', cwd]);

    expect(logSpy).toHaveBeenCalled();
  });

  it('fails check with actionable semver feedback', async () => {
    const cwd = createTempProject();
    writeTextFile(
      cwd,
      'package.json',
      `${JSON.stringify({ name: 'fixture', version: 'v1.2.3' }, null, 2)}\n`,
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'check', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    expect(logSpy.mock.calls.flat().join('\n')).toContain("Remove the 'v' prefix");
  });

  it('applies a suggested bump through the bump command', async () => {
    const cwd = createTempProject();
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'bump', '--cwd', cwd, '--apply']);

    expect(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')).toContain('1.2.4');
  });

  it('runs validate and sync commands on a configured project', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'sync', '--cwd', cwd]);
    await program.parseAsync(['node', 'versionguard', 'validate', '--cwd', cwd]);

    expect(fs.readFileSync(path.join(cwd, 'README.md'), 'utf-8')).toContain('1.2.3');
  });

  it('prints sync and changelog guidance for failing validation', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'validate', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Sync Issues:');
    expect(output).toContain('Changelog Issues:');
    expect(output).toContain('npx versionguard sync');
    expect(output).toContain('npx versionguard fix');
  });

  it('handles unmatched sync mismatch messages during validation', async () => {
    const cwd = createTempProject();
    makeHealthyProject(cwd);
    vi.spyOn(indexModule, 'validate').mockResolvedValue({
      valid: false,
      version: '1.2.3',
      versionValid: true,
      syncValid: false,
      changelogValid: true,
      scanValid: true,
      guardValid: true,
      publishValid: true,
      errors: ['Version mismatch in README.md - unexpected format'],
    });
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'validate', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Sync Issues:');
    expect(output).toContain('Validation failed');
    expect(output).not.toContain('has wrong version');
  });

  it('reports validation as json for healthy projects', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'validate', '--cwd', cwd, '--json']);

    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({
      valid: true,
      version: '1.2.3',
      postTag: null,
    });
  });

  it('reports validation failure as json for CI', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'validate', '--cwd', cwd, '--json']),
    ).rejects.toThrow('process.exit:1');

    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({
      valid: false,
      syncValid: false,
      changelogValid: false,
    });
  });

  it('reports post-tag validation success as json', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(cwd, 'CHANGELOG.md', releaseChangelog());
    initGitRepo(cwd);
    installHooks(
      {
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
        enforceHooks: true,
      },
      cwd,
    );
    execSync('git tag -a v1.2.3 -m "Release 1.2.3"', { cwd, stdio: 'ignore' });
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync([
      'node',
      'versionguard',
      'validate',
      '--cwd',
      cwd,
      '--hook',
      'post-tag',
      '--json',
    ]);

    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({
      valid: true,
      hook: 'post-tag',
      postTag: {
        success: true,
        message: 'Post-tag workflow completed for v1.2.3',
      },
    });
  });

  it('reports post-tag validation failure as json', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(cwd, 'CHANGELOG.md', releaseChangelog());
    initGitRepo(cwd);
    installHooks(
      {
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
        enforceHooks: true,
      },
      cwd,
    );
    execSync('git tag -a v1.2.2 -m "Release 1.2.2"', { cwd, stdio: 'ignore' });
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync([
        'node',
        'versionguard',
        'validate',
        '--cwd',
        cwd,
        '--hook',
        'post-tag',
        '--json',
      ]),
    ).rejects.toThrow('process.exit:1');

    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({
      valid: true,
      hook: 'post-tag',
      postTag: {
        success: false,
        message: "Tag version 1.2.2 doesn't match manifest version 1.2.3",
      },
    });
  });

  it('reports post-tag failures in text mode', async () => {
    const cwd = createTempProject();
    makeHealthyProject(cwd);
    initGitRepo(cwd);
    installHooks(
      {
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
        enforceHooks: true,
      },
      cwd,
    );
    execSync('git tag -a v1.2.2 -m "Release 1.2.2"', { cwd, stdio: 'ignore' });
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'validate', '--cwd', cwd, '--hook', 'post-tag']),
    ).rejects.toThrow('process.exit:1');

    expect(logSpy.mock.calls.flat().join('\n')).toContain(
      "Tag version 1.2.2 doesn't match manifest version 1.2.3",
    );
  });

  it('reports repository readiness through the doctor command', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );
    writeTextFile(cwd, '.github/dependabot.yml', 'version: 2\nupdates: []\n');
    initGitRepo(cwd);
    installHooks(
      {
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
        enforceHooks: true,
      },
      cwd,
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'doctor', '--cwd', cwd]);

    expect(logSpy).toHaveBeenCalled();
  });

  it('prints doctor details for missing versions and dirty repositories', async () => {
    const cwd = createTempProject();
    vi.spyOn(indexModule, 'doctor').mockResolvedValue({
      ready: false,
      version: '',
      versionValid: false,
      syncValid: false,
      changelogValid: false,
      scanValid: true,
      guardValid: true,
      publishValid: true,
      gitRepository: true,
      hooksInstalled: false,
      worktreeClean: false,
      errors: ['Git hooks are not installed', 'Working tree is not clean'],
    });
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'doctor', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Version: (missing)');
    expect(output).toContain('Version valid: no');
    expect(output).toContain('Hooks installed: no');
    expect(output).toContain('Worktree clean: no');
  });

  it('reports doctor issues in text mode', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'doctor', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('VersionGuard Doctor');
    expect(output).toContain('Issues:');
  });

  it('reports repository readiness as json for agents and CI', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'doctor', '--cwd', cwd, '--json']);

    const payload = logSpy.mock.calls[0]?.[0];
    expect(typeof payload).toBe('string');
    expect(JSON.parse(String(payload))).toMatchObject({ ready: true, version: '1.2.3' });
  });

  it('reports doctor failure as json for agents and CI', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'doctor', '--cwd', cwd, '--json']),
    ).rejects.toThrow('process.exit:1');

    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({
      ready: false,
      syncValid: false,
    });
  });

  it('supports hook status and uninstall flows', async () => {
    const cwd = createTempProject();
    initGitRepo(cwd);
    installHooks(
      {
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
        enforceHooks: true,
      },
      cwd,
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'hooks', 'status', '--cwd', cwd]);
    await program.parseAsync(['node', 'versionguard', 'hooks', 'uninstall', '--cwd', cwd]);

    expect(logSpy).toHaveBeenCalled();
    expect(fs.existsSync(path.join(cwd, '.git/hooks/pre-commit'))).toBe(false);
  });

  it('reports hook uninstall errors when cleanup fails', async () => {
    const cwd = createTempProject();
    const uninstallSpy = vi.spyOn(indexModule, 'uninstallHooks').mockImplementation(() => {
      throw new Error('Failed to remove hooks');
    });
    const program = createProgram();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'hooks', 'uninstall', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    expect(uninstallSpy).toHaveBeenCalledWith(cwd);
    expect(errorSpy.mock.calls.flat().join('\n')).toContain('Failed to remove hooks');
  });

  it('fails hook status when hooks are missing', async () => {
    const cwd = createTempProject();
    initGitRepo(cwd);
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'hooks', 'status', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    expect(logSpy.mock.calls.flat().join('\n')).toContain('hooks are not installed');
  });

  it('repairs sync files and changelog through the fix command', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'fix', '--cwd', cwd]);

    expect(fs.readFileSync(path.join(cwd, 'README.md'), 'utf-8')).toContain('1.2.3');
    expect(fs.readFileSync(path.join(cwd, 'CHANGELOG.md'), 'utf-8')).toContain('## [1.2.3]');
    expect(logSpy.mock.calls.flat().join('\n')).toContain(
      'Created CHANGELOG.md with entry for 1.2.3',
    );
  });

  it('prints no-op results when fix finds nothing to change', async () => {
    const cwd = createTempProject();
    makeHealthyProject(cwd);
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'fix', '--cwd', cwd]);

    expect(logSpy.mock.calls.flat().join('\n')).toContain('All files already in sync');
  });

  it('reports fix command errors', async () => {
    const cwd = createTempProject();
    vi.spyOn(fixModule, 'fixAll').mockImplementation(() => {
      throw new Error('Fix failed');
    });
    const program = createProgram();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failOnExit();

    await expect(program.parseAsync(['node', 'versionguard', 'fix', '--cwd', cwd])).rejects.toThrow(
      'process.exit:1',
    );

    expect(errorSpy.mock.calls.flat().join('\n')).toContain('Fix failed');
  });

  it('prints no-op results when sync finds nothing to change', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'sync', '--cwd', cwd]);

    expect(logSpy.mock.calls.flat().join('\n')).toContain('All files already in sync');
  });

  it('reports sync command errors', async () => {
    const cwd = createTempProject();
    vi.spyOn(fixModule, 'fixSyncIssues').mockImplementation(() => {
      throw new Error('Sync failed');
    });
    const program = createProgram();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'sync', '--cwd', cwd]),
    ).rejects.toThrow('process.exit:1');

    expect(errorSpy.mock.calls.flat().join('\n')).toContain('Sync failed');
  });

  it('creates a tag through the tag command', async () => {
    const cwd = createTempProject();
    writeTextFile(
      cwd,
      'CHANGELOG.md',
      '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-03-21\n\n### Added\n\n- Initial release\n\n[Unreleased]: https://example.com\n',
    );
    initGitRepo(cwd);
    installHooks(
      {
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
        enforceHooks: true,
      },
      cwd,
    );
    const program = createProgram();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync([
      'node',
      'versionguard',
      'tag',
      '1.2.3',
      '--cwd',
      cwd,
      '-m',
      'Release 1.2.3',
    ]);

    expect(execSync('git tag --list', { cwd, encoding: 'utf-8' })).toContain('v1.2.3');
  });

  it('uses package.json version when tag version is omitted', async () => {
    const cwd = createTempProject();
    makeHealthyProject(cwd);
    initGitRepo(cwd);
    installHooks(
      {
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
        enforceHooks: true,
      },
      cwd,
    );
    const program = createProgram();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['node', 'versionguard', 'tag', '--cwd', cwd]);

    expect(execSync('git tag --list', { cwd, encoding: 'utf-8' })).toContain('v1.2.3');
  });

  it('fails bump apply when no suggestions are available', async () => {
    const cwd = createTempProject();
    vi.spyOn(fixModule, 'suggestNextVersion').mockReturnValue([]);
    const program = createProgram();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'bump', '--cwd', cwd, '--apply']),
    ).rejects.toThrow('process.exit:1');

    expect(errorSpy.mock.calls.flat().join('\n')).toContain('No version suggestion available');
  });

  it('fails tag creation without auto-fix when versions differ', async () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.4"\n');
    writeTextFile(cwd, 'CHANGELOG.md', releaseChangelog('1.2.4'));
    initGitRepo(cwd);
    installHooks(
      {
        hooks: {
          'pre-commit': true,
          'pre-push': true,
          'post-tag': true,
        },
        enforceHooks: true,
      },
      cwd,
    );
    const program = createProgram();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    failOnExit();

    await expect(
      program.parseAsync(['node', 'versionguard', 'tag', '1.2.4', '--cwd', cwd, '--no-fix']),
    ).rejects.toThrow('process.exit:1');

    expect(logSpy.mock.calls.flat().join('\n')).toContain(
      'Version mismatch: manifest version is 1.2.3, tag is 1.2.4',
    );
  });

  it('delegates argv parsing through runCli', async () => {
    const parseSpy = vi.spyOn(Command.prototype, 'parseAsync').mockResolvedValue(new Command());

    await runCli(['node', 'versionguard', 'doctor', '--json']);

    expect(parseSpy).toHaveBeenCalledWith(['node', 'versionguard', 'doctor', '--json']);
  });

  it('detects direct cli execution from argv and module url', () => {
    expect(shouldRunCli(['node', '/tmp/cli.js'], 'file:///tmp/cli.js')).toBe(true);
    expect(shouldRunCli(['node', '/tmp/other.js'], 'file:///tmp/cli.js')).toBe(false);
    expect(shouldRunCli(['node'], 'file:///tmp/cli.js')).toBe(false);
  });
});
