import * as fs from 'node:fs';
import * as path from 'node:path';

import type { GitConfig } from './types';

const HOOK_NAMES = ['pre-commit', 'pre-push', 'post-tag'] as const;

/**
 * Installs VersionGuard-managed Git hooks in a repository.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Only hooks enabled in `config.hooks` are written. Each installed hook runs
 * `versionguard validate` for its corresponding hook name.
 *
 * @param config - Git configuration that selects which hooks to install.
 * @param cwd - Repository directory where hooks should be installed.
 * @example
 * ```ts
 * import { getDefaultConfig, installHooks } from 'versionguard';
 *
 * installHooks(getDefaultConfig().git, process.cwd());
 * ```
 */
export function installHooks(config: GitConfig, cwd: string = process.cwd()): void {
  const gitDir = findGitDir(cwd);
  if (!gitDir) {
    throw new Error('Not a git repository. Run `git init` first.');
  }

  const hooksDir = path.join(gitDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  for (const hookName of HOOK_NAMES) {
    if (config.hooks[hookName]) {
      const hookPath = path.join(hooksDir, hookName);
      fs.writeFileSync(hookPath, generateHookScript(hookName), { encoding: 'utf-8', mode: 0o755 });
    }
  }
}

/**
 * Removes VersionGuard-managed Git hooks from a repository.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Only hook files containing `versionguard` are removed so unrelated custom
 * hooks are left untouched.
 *
 * @param cwd - Repository directory whose hooks should be cleaned up.
 * @example
 * ```ts
 * import { uninstallHooks } from 'versionguard';
 *
 * uninstallHooks(process.cwd());
 * ```
 */
export function uninstallHooks(cwd: string = process.cwd()): void {
  const gitDir = findGitDir(cwd);
  if (!gitDir) {
    return;
  }

  const hooksDir = path.join(gitDir, 'hooks');
  for (const hookName of HOOK_NAMES) {
    const hookPath = path.join(hooksDir, hookName);
    if (fs.existsSync(hookPath) && fs.readFileSync(hookPath, 'utf-8').includes('versionguard')) {
      fs.unlinkSync(hookPath);
    }
  }
}

/**
 * Finds the nearest `.git` directory by walking up from a starting directory.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This only resolves `.git` directories and returns `null` when the search
 * reaches the filesystem root without finding a repository.
 *
 * @param cwd - Directory to start searching from.
 * @returns The resolved `.git` directory path, or `null` when none is found.
 * @example
 * ```ts
 * import { findGitDir } from 'versionguard';
 *
 * const gitDir = findGitDir(process.cwd());
 * ```
 */
export function findGitDir(cwd: string): string | null {
  let current = cwd;

  while (true) {
    const gitPath = path.join(current, '.git');
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
      return gitPath;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/**
 * Checks whether all VersionGuard-managed hooks are installed.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * A hook counts as installed only when the file exists and contains the
 * `versionguard` invocation written by this package.
 *
 * @param cwd - Repository directory to inspect.
 * @returns `true` when every managed hook is installed.
 * @example
 * ```ts
 * import { areHooksInstalled } from 'versionguard';
 *
 * const installed = areHooksInstalled(process.cwd());
 * ```
 */
export function areHooksInstalled(cwd: string = process.cwd()): boolean {
  const gitDir = findGitDir(cwd);
  if (!gitDir) {
    return false;
  }

  return HOOK_NAMES.every((hookName) => {
    const hookPath = path.join(gitDir, 'hooks', hookName);
    return fs.existsSync(hookPath) && fs.readFileSync(hookPath, 'utf-8').includes('versionguard');
  });
}

/**
 * Generates the shell script content for a Git hook.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The generated script delegates to `npx versionguard validate` and exits with
 * the validation status code.
 *
 * @param hookName - Name of the Git hook to generate.
 * @returns Executable shell script contents for the hook.
 * @example
 * ```ts
 * import { generateHookScript } from 'versionguard';
 *
 * const script = generateHookScript('pre-commit');
 * ```
 */
export function generateHookScript(hookName: (typeof HOOK_NAMES)[number]): string {
  return `#!/bin/sh
# VersionGuard ${hookName} hook
# --no-install prevents accidentally downloading an unscoped package
# if @codluv/versionguard is not installed locally
npx --no-install versionguard validate --hook=${hookName}
status=$?
if [ $status -ne 0 ]; then
  echo "VersionGuard validation failed."
  exit $status
fi
`;
}
