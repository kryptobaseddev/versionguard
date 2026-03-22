import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '../config';
import { installHooks } from '../hooks';
import {
  createTag,
  getAllTags,
  getLatestTag,
  handlePostTag,
  suggestTagMessage,
  validateTagForPush,
} from '../tag';
import {
  addGitRemote,
  createBareRemote,
  createTempProject,
  initGitRepo,
  writeTextFile,
} from './test-utils';

function writeReleaseChangelog(
  cwd: string,
  version: string,
  bullet: string = 'Initial release',
): void {
  writeTextFile(
    cwd,
    'CHANGELOG.md',
    `# Changelog\n\n## [Unreleased]\n\n## [${version}] - 2026-03-21\n\n### Added\n\n- ${bullet}\n\n[Unreleased]: https://example.com\n`,
  );
}

function writeUnreleasedChangelog(cwd: string): void {
  writeTextFile(
    cwd,
    'CHANGELOG.md',
    '# Changelog\n\n## [Unreleased]\n\n[Unreleased]: https://example.com\n',
  );
}

describe('tag automation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an annotated tag for the package version', () => {
    const cwd = createTempProject();
    writeReleaseChangelog(cwd, '1.2.3');
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);

    const result = createTag('1.2.3', 'Release 1.2.3', true, getDefaultConfig(), cwd);
    const latestTag = getLatestTag(cwd);

    expect(result.success).toBe(true);
    expect(execSync('git tag --list', { cwd, encoding: 'utf-8' })).toContain('v1.2.3');
    expect(latestTag?.version).toBe('1.2.3');
    expect(latestTag?.message).toBe('Release 1.2.3');
    expect(getAllTags(cwd)).toHaveLength(1);
  });

  it('parses empty annotated tag messages as undefined', () => {
    const cwd = createTempProject();
    writeReleaseChangelog(cwd, '1.2.3');
    initGitRepo(cwd);
    execSync('git tag -a v1.2.3 -m ""', { cwd, stdio: 'ignore' });

    expect(getLatestTag(cwd)).toMatchObject({
      name: 'v1.2.3',
      version: '1.2.3',
      message: undefined,
    });
  });

  it('auto-fixes versioned files before tagging a new release version', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeUnreleasedChangelog(cwd);
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);

    const result = createTag(
      '1.2.4',
      'Release "1.2.4" for team\'s build',
      true,
      getDefaultConfig(),
      cwd,
    );

    expect(result.success).toBe(true);
    expect(result.actions).toContain('Committed version changes');
    expect(fs.readFileSync(`${cwd}/package.json`, 'utf-8')).toContain('"version": "1.2.4"');
    expect(fs.readFileSync(`${cwd}/README.md`, 'utf-8')).toContain('version = "1.2.4"');
    expect(fs.readFileSync(`${cwd}/CHANGELOG.md`, 'utf-8')).toContain('## [1.2.4]');
    expect(execSync('git log -1 --pretty=%s', { cwd, encoding: 'utf-8' }).trim()).toBe(
      'chore(release): 1.2.4',
    );
    expect(getLatestTag(cwd)?.message).toBe('Release "1.2.4" for team\'s build');
  });

  it('auto-fixes sync and changelog issues even when package.json already matches', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeUnreleasedChangelog(cwd);
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);

    const result = createTag('1.2.3', undefined, true, getDefaultConfig(), cwd);

    expect(result.success).toBe(true);
    expect(result.actions).toContain('Committed version changes');
    expect(fs.readFileSync(`${cwd}/README.md`, 'utf-8')).toContain('version = "1.2.3"');
    expect(fs.readFileSync(`${cwd}/CHANGELOG.md`, 'utf-8')).toContain('## [1.2.3]');
    expect(execSync('git rev-list --count HEAD', { cwd, encoding: 'utf-8' }).trim()).toBe('2');
  });

  it('rejects unsafe createTag inputs and duplicate tags', () => {
    const cwd = createTempProject();
    writeReleaseChangelog(cwd, '1.2.3');
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);

    expect(createTag('1.2.3', 'Release', true, undefined, cwd).success).toBe(false);
    expect(createTag('1.2.4', 'Release', false, getDefaultConfig(), cwd).message).toContain(
      'Version mismatch',
    );

    expect(createTag('1.2.3', 'Release', true, getDefaultConfig(), cwd).success).toBe(true);
    expect(createTag('1.2.3', 'Release', true, getDefaultConfig(), cwd).message).toContain(
      'already exists',
    );
  });

  it('surfaces git command failures during tag creation', () => {
    const cwd = createTempProject();
    writeReleaseChangelog(cwd, '1.2.3');
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);
    fs.chmodSync(path.join(cwd, '.git/refs/tags'), 0o500);

    const result = createTag('1.2.3', 'Release 1.2.3', true, getDefaultConfig(), cwd);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to create tag');
  });

  it('surfaces preflight sync, version, and changelog errors', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "0.0.1"\n');
    writeUnreleasedChangelog(cwd);
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);

    const syncMismatch = createTag('1.2.3', 'Release', false, getDefaultConfig(), cwd);
    expect(syncMismatch.message).toContain('Version mismatch');

    const cleanCwd = createTempProject();
    writeUnreleasedChangelog(cleanCwd);
    initGitRepo(cleanCwd);
    installHooks(getDefaultConfig().git, cleanCwd);

    const invalidVersion = createTag('v1.2.3', 'Release', false, getDefaultConfig(), cleanCwd);
    expect(invalidVersion.message).toContain("should not start with 'v'");

    const badChangelog = createTag('1.2.3', 'Release', false, getDefaultConfig(), cleanCwd);
    expect(badChangelog.message).toContain('Changelog');
  });

  it('refuses to tag when hooks are required but missing', () => {
    const cwd = createTempProject();
    writeReleaseChangelog(cwd, '1.2.3');
    initGitRepo(cwd);

    const result = createTag('1.2.3', 'Release 1.2.3', true, getDefaultConfig(), cwd);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Git hooks must be installed');
  });

  it('refuses to tag from a dirty worktree', () => {
    const cwd = createTempProject();
    writeReleaseChangelog(cwd, '1.2.3');
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');

    const result = createTag('1.2.3', 'Release 1.2.3', true, getDefaultConfig(), cwd);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Working tree must be clean');
  });

  it('suggests tag messages from changelog entries and validates post-tag state', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'README.md', 'version = "1.2.3"\n');
    writeReleaseChangelog(cwd, '1.2.3', 'Added release automation');
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);
    execSync('git tag -a v1.2.3 -m "Release 1.2.3"', { cwd });

    expect(suggestTagMessage('1.2.3', cwd)).toContain('Added release automation');
    expect(handlePostTag(getDefaultConfig(), cwd).success).toBe(true);
  });

  it('handles post-tag failure states and fallback messages', () => {
    const noTagCwd = createTempProject();
    writeReleaseChangelog(noTagCwd, '1.2.3');
    initGitRepo(noTagCwd);
    installHooks(getDefaultConfig().git, noTagCwd);
    expect(handlePostTag(getDefaultConfig(), noTagCwd).message).toContain('No tag found');

    const mismatchCwd = createTempProject();
    writeReleaseChangelog(mismatchCwd, '1.2.3');
    initGitRepo(mismatchCwd);
    installHooks(getDefaultConfig().git, mismatchCwd);
    execSync('git tag -a v9.9.9 -m "Wrong release"', { cwd: mismatchCwd });
    expect(handlePostTag(getDefaultConfig(), mismatchCwd).message).toContain("doesn't match");

    expect(suggestTagMessage('9.9.9', mismatchCwd)).toBe('Release 9.9.9');
    expect(getLatestTag(createTempProject())).toBeNull();
    expect(getAllTags(createTempProject())).toEqual([]);
  });

  it('fails post-tag validation during preflight and treats non-git worktrees as dirty', () => {
    const preflightCwd = createTempProject();
    writeReleaseChangelog(preflightCwd, '1.2.3');
    initGitRepo(preflightCwd);

    expect(handlePostTag(getDefaultConfig(), preflightCwd)).toMatchObject({
      success: false,
      message: 'Git hooks must be installed before creating or validating release tags',
    });

    const nonGitCwd = createTempProject();
    writeReleaseChangelog(nonGitCwd, '1.2.3');
    const config = getDefaultConfig();
    config.git.enforceHooks = false;

    expect(createTag('1.2.3', 'Release 1.2.3', true, config, nonGitCwd)).toMatchObject({
      success: false,
      message: 'Working tree must be clean before creating or validating release tags',
    });
  });

  it('falls back when changelog reads fail and reports post-tag runtime failures', () => {
    const fallbackCwd = createTempProject();
    fs.mkdirSync(path.join(fallbackCwd, 'CHANGELOG.md'));
    expect(suggestTagMessage('1.2.3', fallbackCwd)).toBe('Release 1.2.3');

    const brokenPostTagCwd = createTempProject();
    writeReleaseChangelog(brokenPostTagCwd, '1.2.3');
    initGitRepo(brokenPostTagCwd);
    installHooks(getDefaultConfig().git, brokenPostTagCwd);
    execSync('git tag -a v1.2.3 -m "Release 1.2.3"', { cwd: brokenPostTagCwd });
    fs.unlinkSync(path.join(brokenPostTagCwd, 'package.json'));
    execSync('git add -A && git commit --no-verify -m "chore: remove package"', {
      cwd: brokenPostTagCwd,
      stdio: 'ignore',
    });

    expect(handlePostTag(getDefaultConfig(), brokenPostTagCwd).message).toContain(
      'Post-tag workflow failed',
    );
  });

  it('treats tags as push-ready when no origin remote is configured', () => {
    const cwd = createTempProject();
    writeReleaseChangelog(cwd, '1.2.3');
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);

    expect(createTag('1.2.3', 'Release 1.2.3', true, getDefaultConfig(), cwd).success).toBe(true);
    expect(validateTagForPush('v1.2.3', cwd)).toEqual({
      valid: true,
      message: 'Tag v1.2.3 is valid for push',
    });
  });

  it('validates tag push readiness against a remote', () => {
    const cwd = createTempProject();
    const remote = createBareRemote();
    writeReleaseChangelog(cwd, '1.2.3');
    initGitRepo(cwd);
    installHooks(getDefaultConfig().git, cwd);
    addGitRemote(cwd, remote);

    const result = createTag('1.2.3', 'Release 1.2.3', true, getDefaultConfig(), cwd);
    expect(result.success).toBe(true);
    expect(validateTagForPush('v1.2.3', cwd).valid).toBe(true);

    execSync('git branch -M main', { cwd, stdio: 'ignore' });
    execSync('git -c protocol.file.allow=always push --no-verify -u origin main', {
      cwd,
      stdio: 'ignore',
    });
    execSync('git -c protocol.file.allow=always push --no-verify origin v1.2.3', {
      cwd,
      stdio: 'ignore',
    });
    expect(validateTagForPush('v1.2.3', cwd).valid).toBe(true);
  });

  it('detects remote tag conflicts and missing local tags', () => {
    const remote = createBareRemote();

    const source = createTempProject();
    writeReleaseChangelog(source, '1.2.3', 'Source release');
    initGitRepo(source);
    installHooks(getDefaultConfig().git, source);
    addGitRemote(source, remote);
    expect(createTag('1.2.3', 'Release 1.2.3', true, getDefaultConfig(), source).success).toBe(
      true,
    );
    execSync('git branch -M main', { cwd: source, stdio: 'ignore' });
    execSync('git -c protocol.file.allow=always push --no-verify -u origin main', {
      cwd: source,
      stdio: 'ignore',
    });
    execSync('git -c protocol.file.allow=always push --no-verify origin v1.2.3', {
      cwd: source,
      stdio: 'ignore',
    });

    const other = createTempProject();
    writeReleaseChangelog(other, '1.2.3', 'Other release');
    initGitRepo(other);
    installHooks(getDefaultConfig().git, other);
    addGitRemote(other, remote);
    writeTextFile(other, 'README.md', 'version = "1.2.3"\n');
    execSync('git add README.md && git commit --no-verify -m "docs: diverge"', {
      cwd: other,
      stdio: 'ignore',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'VersionGuard',
        GIT_AUTHOR_EMAIL: 'versionguard@example.com',
        GIT_COMMITTER_NAME: 'VersionGuard',
        GIT_COMMITTER_EMAIL: 'versionguard@example.com',
      },
    });
    execSync('git tag -a v1.2.3 -m "Conflicting release"', { cwd: other });

    const conflicting = validateTagForPush('v1.2.3', other);
    expect(conflicting.valid).toBe(false);
    expect(conflicting.message).toContain('exists on remote with different commit');

    const missing = validateTagForPush('v9.9.9', other);
    expect(missing.valid).toBe(false);
    expect(missing.message).toContain('not found locally');
  });
});
