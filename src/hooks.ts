import * as fs from 'node:fs';
import * as path from 'node:path';

import type { GitConfig } from './types';

const HOOK_NAMES = ['pre-commit', 'pre-push', 'post-tag'] as const;

/** Markers that delimit the VG block within a composite hook script. */
const VG_BLOCK_START = '# >>> versionguard >>>';
const VG_BLOCK_END = '# <<< versionguard <<<';

/**
 * Installs VersionGuard-managed Git hooks in a repository.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * When a hook file already exists from another tool (Husky, lefthook, etc.),
 * VersionGuard **appends** its validation block instead of overwriting.
 * The block is delimited by markers so it can be cleanly removed later.
 *
 * If the hook already contains a VersionGuard block, it is replaced in-place
 * (idempotent).
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
      const vgBlock = generateHookBlock(hookName);

      if (fs.existsSync(hookPath)) {
        const existing = fs.readFileSync(hookPath, 'utf-8');

        if (existing.includes(VG_BLOCK_START)) {
          // Replace existing VG block in-place (idempotent)
          const updated = replaceVgBlock(existing, vgBlock);
          fs.writeFileSync(hookPath, updated, { encoding: 'utf-8', mode: 0o755 });
        } else {
          // Append VG block to existing hook (cooperative)
          const appended = `${existing.trimEnd()}\n\n${vgBlock}\n`;
          fs.writeFileSync(hookPath, appended, { encoding: 'utf-8', mode: 0o755 });
        }
      } else {
        // No existing hook — write a fresh one
        fs.writeFileSync(hookPath, `#!/bin/sh\n\n${vgBlock}\n`, {
          encoding: 'utf-8',
          mode: 0o755,
        });
      }
    }
  }
}

/**
 * Removes VersionGuard-managed Git hooks from a repository.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Only the VersionGuard block (delimited by markers) is removed.
 * Other hook content from Husky, lefthook, etc. is preserved.
 * If the hook becomes empty after removal, the file is deleted.
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
    if (!fs.existsSync(hookPath)) continue;

    const content = fs.readFileSync(hookPath, 'utf-8');
    if (!content.includes('versionguard')) continue;

    if (content.includes(VG_BLOCK_START)) {
      // Remove only the VG block, preserve everything else
      const cleaned = removeVgBlock(content);
      const trimmed = cleaned.trim();

      if (!trimmed || trimmed === '#!/bin/sh') {
        // Hook is now empty — remove the file
        fs.unlinkSync(hookPath);
      } else {
        fs.writeFileSync(hookPath, `${trimmed}\n`, { encoding: 'utf-8', mode: 0o755 });
      }
    } else {
      // Legacy VG hook (no markers) — only delete if VG is the sole content
      if (content.includes('# versionguard') && !content.includes('husky')) {
        fs.unlinkSync(hookPath);
      }
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
 * A hook counts as installed when the file exists and contains the
 * `versionguard` invocation — either as a standalone hook or appended
 * to an existing hook from another tool.
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
 * Generates the delimited VG block for a Git hook.
 *
 * @param hookName - Name of the Git hook to generate.
 * @returns The VG block with start/end markers.
 */
function generateHookBlock(hookName: (typeof HOOK_NAMES)[number]): string {
  return `${VG_BLOCK_START}
# VersionGuard ${hookName} hook
# --no-install prevents accidentally downloading an unscoped package
# if @codluv/versionguard is not installed locally
npx --no-install versionguard validate --hook=${hookName}
status=$?
if [ $status -ne 0 ]; then
  echo "VersionGuard validation failed."
  exit $status
fi
${VG_BLOCK_END}`;
}

/**
 * Generates the shell script content for a Git hook.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The generated script delegates to `npx versionguard validate` and exits with
 * the validation status code. Uses delimited block markers for cooperative
 * installation with other hook tools.
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
  return `#!/bin/sh\n\n${generateHookBlock(hookName)}\n`;
}

/** Replaces an existing VG block within a hook script. */
function replaceVgBlock(content: string, newBlock: string): string {
  const startIdx = content.indexOf(VG_BLOCK_START);
  const endIdx = content.indexOf(VG_BLOCK_END);
  if (startIdx === -1 || endIdx === -1) return content;
  return content.slice(0, startIdx) + newBlock + content.slice(endIdx + VG_BLOCK_END.length);
}

/** Removes the VG block from a hook script. */
function removeVgBlock(content: string): string {
  const startIdx = content.indexOf(VG_BLOCK_START);
  const endIdx = content.indexOf(VG_BLOCK_END);
  if (startIdx === -1 || endIdx === -1) return content;

  // Remove the block and any surrounding blank lines
  const before = content.slice(0, startIdx).replace(/\n\n$/, '\n');
  const after = content.slice(endIdx + VG_BLOCK_END.length).replace(/^\n\n/, '\n');
  return before + after;
}
