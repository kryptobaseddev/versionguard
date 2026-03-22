/**
 * Test helpers for creating temporary VersionGuard fixture projects and git repositories.
 *
 * @packageDocumentation
 * @public
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Creates a temporary project directory with a minimal `package.json` fixture.
 *
 * @remarks
 * The returned directory is isolated and suitable for integration-style tests
 * that mutate files or initialize git state.
 *
 * @returns The absolute path to the temporary project directory.
 *
 * @example
 * ```ts
 * const cwd = createTempProject();
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function createTempProject(): string {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'versionguard-'));
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    `${JSON.stringify({ name: 'fixture', version: '1.2.3' }, null, 2)}\n`,
    'utf-8',
  );
  return cwd;
}

/**
 * Initializes a git repository in a fixture directory with a first commit.
 *
 * @remarks
 * This helper configures a local git username and email so tests can commit
 * without mutating global git configuration.
 *
 * @param cwd - Absolute path to the fixture repository.
 *
 * @example
 * ```ts
 * initGitRepo(cwd);
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function initGitRepo(cwd: string): void {
  execSync('git init', { cwd, stdio: 'ignore' });
  execSync('git config user.name "VersionGuard"', { cwd, stdio: 'ignore' });
  execSync('git config user.email "versionguard@example.com"', { cwd, stdio: 'ignore' });
  execSync('git add -A', { cwd, stdio: 'ignore' });
  execSync('git commit -m "initial"', {
    cwd,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'VersionGuard',
      GIT_AUTHOR_EMAIL: 'versionguard@example.com',
      GIT_COMMITTER_NAME: 'VersionGuard',
      GIT_COMMITTER_EMAIL: 'versionguard@example.com',
    },
  });
}

/**
 * Writes a text fixture file relative to a temporary project directory.
 *
 * @remarks
 * Parent directories are created automatically when they do not already exist.
 *
 * @param cwd - Absolute path to the fixture project.
 * @param relativePath - Relative file path to create or overwrite.
 * @param content - UTF-8 text content to write.
 * @returns The absolute file path that was written.
 *
 * @example
 * ```ts
 * writeTextFile(cwd, 'README.md', '# Fixture');
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function writeTextFile(cwd: string, relativePath: string, content: string): string {
  const filePath = path.join(cwd, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Creates a bare git repository to use as a remote in integration tests.
 *
 * @remarks
 * The returned directory can be attached as an `origin` remote for fixture
 * repositories.
 *
 * @returns The absolute path to the new bare repository.
 *
 * @example
 * ```ts
 * const remote = createBareRemote();
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function createBareRemote(): string {
  const remotePath = fs.mkdtempSync(path.join(os.tmpdir(), 'versionguard-remote-'));
  execSync('git init --bare', { cwd: remotePath, stdio: 'ignore' });
  return remotePath;
}

/**
 * Adds a local bare repository as the `origin` remote for a fixture repo.
 *
 * @remarks
 * This helper is used by tag and push integration tests.
 *
 * @param cwd - Absolute path to the fixture repository.
 * @param remotePath - Absolute path to the bare remote repository.
 *
 * @example
 * ```ts
 * addGitRemote(cwd, remotePath);
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function addGitRemote(cwd: string, remotePath: string): void {
  execSync(`git remote add origin "${remotePath}"`, { cwd, stdio: 'ignore' });
}

/**
 * Stages all changes and creates a commit in a fixture repository.
 *
 * @remarks
 * The helper uses repository-local author metadata so tests stay hermetic.
 *
 * @param cwd - Absolute path to the fixture repository.
 * @param message - Commit message to use for the new commit.
 *
 * @example
 * ```ts
 * commitAll(cwd, 'test: update fixture');
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function commitAll(cwd: string, message: string): void {
  execSync('git add -A', { cwd, stdio: 'ignore' });
  execSync(`git commit -m "${message}"`, {
    cwd,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'VersionGuard',
      GIT_AUTHOR_EMAIL: 'versionguard@example.com',
      GIT_COMMITTER_NAME: 'VersionGuard',
      GIT_COMMITTER_EMAIL: 'versionguard@example.com',
    },
  });
}
