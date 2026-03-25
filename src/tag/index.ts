import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { validate as validateCalVer } from '../calver';
import { validateChangelog } from '../changelog';
import { fixAll } from '../fix';
import { areHooksInstalled } from '../hooks';
import { getPackageVersion } from '../project';
import { validate as validateSemVer } from '../semver';
import { checkHardcodedVersions } from '../sync';
import type { VersionGuardConfig } from '../types';

/**
 * Tag management helpers for reading, validating, and creating release tags.
 *
 * @packageDocumentation
 * @public
 */

/**
 * Tag entry point exports for release-tag management helpers.
 *
 * @packageDocumentation
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface TagInfo {
  /**
   * Full git tag name, including any prefix such as `v`.
   */
  name: string;

  /**
   * Normalized version string derived from the tag name.
   */
  version: string;

  /**
   * Annotated tag message when one is available.
   *
   * @defaultValue `undefined`
   */
  message?: string;

  /**
   * Timestamp associated with the tag lookup result.
   */
  date: Date;
}

function runGit(cwd: string, args: string[], encoding?: BufferEncoding): string | Buffer {
  return childProcess.execFileSync('git', args, {
    cwd,
    encoding,
    stdio: ['pipe', 'pipe', 'ignore'],
  });
}

function runGitText(cwd: string, args: string[]): string {
  return runGit(cwd, args, 'utf-8') as string;
}

/**
 * Returns the most recent reachable git tag for a repository.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper reads the most recent annotated or lightweight tag that `git describe`
 * can resolve from the current HEAD. It returns `null` when no tags are available
 * or when git metadata cannot be read.
 *
 * @param cwd - Repository directory to inspect.
 * @returns The latest tag details, or `null` when no tag can be resolved.
 *
 * @example
 * ```typescript
 * const latestTag = getLatestTag(process.cwd());
 *
 * if (latestTag) {
 *   console.log(latestTag.version);
 * }
 * ```
 */
export function getLatestTag(cwd: string = process.cwd()): TagInfo | null {
  try {
    const result = runGitText(cwd, ['describe', '--tags', '--abbrev=0']);

    const tagName = result.trim();
    const version = tagName.replace(/^v/, '');

    const dateResult = runGitText(cwd, ['log', '-1', '--format=%ai', tagName]);
    const messageResult = runGitText(cwd, ['tag', '-l', tagName, '--format=%(contents)']);
    const message = messageResult.trim();

    return {
      name: tagName,
      version,
      message: message.length > 0 ? message : undefined,
      date: new Date(dateResult.trim()),
    };
  } catch {
    return null;
  }
}

/**
 * Lists all tags in a repository.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper returns tag names in the order provided by `git tag --list`. The
 * `date` field is populated with the current time because the implementation does
 * not perform per-tag date lookups.
 *
 * @param cwd - Repository directory to inspect.
 * @returns A list of discovered tags, or an empty array when tags cannot be read.
 *
 * @example
 * ```typescript
 * const tags = getAllTags(process.cwd());
 * console.log(tags.map((tag) => tag.name));
 * ```
 */
export function getAllTags(cwd: string = process.cwd()): TagInfo[] {
  try {
    const result = runGitText(cwd, ['tag', '--list']);

    return result
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((name) => ({
        name,
        version: name.replace(/^v/, ''),
        date: new Date(), // Would need individual lookup for accurate dates
      }));
  } catch {
    return [];
  }
}

/**
 * Creates a release tag and optionally fixes version state first.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * When `autoFix` is enabled, this helper updates versioned files, stages the
 * changes, and creates a release commit before creating the annotated tag. It
 * returns a structured result instead of throwing for most expected failures.
 *
 * @param version - Version to embed in the new tag name.
 * @param message - Custom annotated tag message.
 * @param autoFix - Whether to auto-fix version mismatches before tagging.
 * @param config - Loaded VersionGuard configuration used for validation and fixes.
 * @param cwd - Repository directory where git commands should run.
 * @returns The tagging outcome and any actions performed along the way.
 *
 * @example
 * ```typescript
 * const result = createTag('1.2.3', 'Release 1.2.3', true, config, process.cwd());
 *
 * if (!result.success) {
 *   console.error(result.message);
 * }
 * ```
 */
export function createTag(
  version: string,
  message?: string,
  autoFix: boolean = true,
  config?: VersionGuardConfig,
  cwd: string = process.cwd(),
): { success: boolean; message: string; actions: string[] } {
  const actions: string[] = [];

  try {
    if (!config) {
      return {
        success: false,
        message: 'VersionGuard config is required to create tags safely',
        actions,
      };
    }

    const packageVersion = getPackageVersion(cwd, config.manifest);
    const shouldAutoFix = autoFix;
    const preflightError = getTagPreflightError(config, cwd, version, shouldAutoFix);
    if (preflightError) {
      return {
        success: false,
        message: preflightError,
        actions,
      };
    }

    if (version !== packageVersion && !autoFix) {
      return {
        success: false,
        message: `Version mismatch: manifest version is ${packageVersion}, tag is ${version}`,
        actions: [],
      };
    }

    if (autoFix) {
      const fixResults =
        version !== packageVersion ? fixAll(config, version, cwd) : fixAll(config, undefined, cwd);

      for (const result of fixResults) {
        if (result.fixed) {
          actions.push(result.message);
        }
      }

      if (fixResults.some((result) => result.fixed)) {
        runGit(cwd, ['add', '-A']);
        runGit(cwd, ['commit', '--no-verify', '-m', `chore(release): ${version}`]);
        actions.push('Committed version changes');
      }
    }

    const tagName = `v${version}`;
    const tagMessage = message || `Release ${version}`;

    if (getAllTags(cwd).some((tag) => tag.name === tagName)) {
      return {
        success: false,
        message: `Tag ${tagName} already exists`,
        actions,
      };
    }

    runGit(cwd, ['tag', '-a', tagName, '-m', tagMessage]);
    actions.push(`Created tag ${tagName}`);

    return {
      success: true,
      message: `Successfully created tag ${tagName}`,
      actions,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to create tag: ${(err as Error).message}`,
      actions,
    };
  }
}

/**
 * Runs post-tag validation and sync checks.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper is intended for the `post-tag` git hook flow. It validates the
 * latest tag against the configured versioning rules and reports any required
 * follow-up actions without mutating git history.
 *
 * @param config - Loaded VersionGuard configuration used during validation.
 * @param cwd - Repository directory where validation should run.
 * @returns The post-tag workflow result and any follow-up actions.
 *
 * @example
 * ```typescript
 * const result = handlePostTag(config, process.cwd());
 * console.log(result.success);
 * ```
 */
export function handlePostTag(
  config: VersionGuardConfig,
  cwd: string = process.cwd(),
): { success: boolean; message: string; actions: string[] } {
  const actions: string[] = [];

  try {
    const preflightError = getTagPreflightError(config, cwd);
    if (preflightError) {
      return {
        success: false,
        message: preflightError,
        actions,
      };
    }

    const tag = getLatestTag(cwd);
    if (!tag) {
      return {
        success: false,
        message: 'No tag found',
        actions,
      };
    }
    const packageVersion = getPackageVersion(cwd, config.manifest);

    if (tag.version !== packageVersion) {
      return {
        success: false,
        message: `Tag version ${tag.version} doesn't match manifest version ${packageVersion}`,
        actions: [
          'To fix: delete tag and recreate with correct version',
          `  git tag -d ${tag.name}`,
          `  Update manifest to ${tag.version}`,
          `  git tag ${tag.name}`,
        ],
      };
    }
    const syncResults = fixAll(config, packageVersion, cwd);

    for (const result of syncResults) {
      /* v8 ignore next 3 -- preflight blocks remaining post-tag fixes */
      if (result.fixed) {
        actions.push(result.message);
      }
    }

    return {
      success: true,
      message: `Post-tag workflow completed for ${tag.name}`,
      actions,
    };
  } catch (err) {
    return {
      success: false,
      message: `Post-tag workflow failed: ${(err as Error).message}`,
      actions,
    };
  }
}

function getTagPreflightError(
  config: VersionGuardConfig,
  cwd: string,
  expectedVersion?: string,
  allowAutoFix: boolean = false,
): string | null {
  if (config.git.enforceHooks && !areHooksInstalled(cwd)) {
    return 'Git hooks must be installed before creating or validating release tags';
  }

  if (hasDirtyWorktree(cwd)) {
    return 'Working tree must be clean before creating or validating release tags';
  }

  const version = expectedVersion ?? getPackageVersion(cwd, config.manifest);
  const versionResult =
    config.versioning.type === 'semver'
      ? validateSemVer(version)
      : validateCalVer(
          version,
          config.versioning.calver?.format ?? 'YYYY.MM.PATCH',
          config.versioning.calver?.preventFutureDates ?? true,
        );

  if (!versionResult.valid) {
    return versionResult.errors[0]?.message ?? `Invalid version: ${version}`;
  }

  if (allowAutoFix) {
    return null;
  }

  const mismatches = checkHardcodedVersions(version, config.sync, config.ignore, cwd);
  if (mismatches.length > 0) {
    const mismatch = mismatches[0];
    return `Version mismatch in ${mismatch.file}:${mismatch.line} - found "${mismatch.found}" but expected "${version}"`;
  }

  const changelogResult = validateChangelog(
    path.join(cwd, config.changelog.file),
    version,
    config.changelog.strict,
    config.changelog.requireEntry,
  );
  if (!changelogResult.valid) {
    return changelogResult.errors[0] ?? 'Changelog validation failed';
  }

  return null;
}

function hasDirtyWorktree(cwd: string): boolean {
  try {
    return runGitText(cwd, ['status', '--porcelain']).trim().length > 0;
  } catch {
    return true;
  }
}

/**
 * Validates that a local tag is safe to push to the default remote.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper checks that the tag exists locally and, when the tag also exists on
 * `origin`, verifies that both references point to the same commit.
 *
 * @param tagName - Name of the tag to validate.
 * @param cwd - Repository directory where git commands should run.
 * @returns A validation result with an optional suggested fix command.
 *
 * @example
 * ```typescript
 * const result = validateTagForPush('v1.2.3', process.cwd());
 * console.log(result.valid);
 * ```
 */
export function validateTagForPush(
  tagName: string,
  cwd: string = process.cwd(),
): { valid: boolean; message: string; fix?: string } {
  try {
    runGit(cwd, ['rev-parse', tagName]);

    try {
      runGit(cwd, ['ls-remote', '--tags', 'origin', tagName]);

      const localHash = runGitText(cwd, ['rev-parse', tagName]).trim();
      const remoteOutput = runGitText(cwd, ['ls-remote', '--tags', 'origin', tagName]).trim();

      if (remoteOutput && !remoteOutput.includes(localHash)) {
        return {
          valid: false,
          message: `Tag ${tagName} exists on remote with different commit`,
          fix: `Delete remote tag first: git push origin :refs/tags/${tagName}`,
        };
      }
    } catch {
      return { valid: true, message: `Tag ${tagName} is valid for push` };
    }

    return { valid: true, message: `Tag ${tagName} is valid for push` };
  } catch {
    return {
      valid: false,
      message: `Tag ${tagName} not found locally`,
      fix: `Create tag: git tag ${tagName}`,
    };
  }
}

/**
 * Suggests an annotated tag message from changelog content.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * When a matching changelog entry exists, this helper uses the first bullet point
 * as a concise release summary. It falls back to a generic `Release {version}`
 * message when no changelog context is available.
 *
 * @param version - Version that the tag will represent.
 * @param cwd - Repository directory containing the changelog file.
 * @returns A suggested annotated tag message.
 *
 * @example
 * ```typescript
 * const message = suggestTagMessage('1.2.3', process.cwd());
 * console.log(message);
 * ```
 */
export function suggestTagMessage(version: string, cwd: string = process.cwd()): string {
  try {
    const changelogPath = path.join(cwd, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const content = fs.readFileSync(changelogPath, 'utf-8');

      const versionRegex = new RegExp(
        `## \\[${version}\\].*?\\n(.*?)(?=\\n## \\[|\\n\\n## |$)`,
        's',
      );
      const match = content.match(versionRegex);

      if (match) {
        const bulletMatch = match[1].match(/- (.+)/);
        if (bulletMatch) {
          return `Release ${version}: ${bulletMatch[1].trim()}`;
        }
      }
    }
  } catch {
    return `Release ${version}`;
  }

  return `Release ${version}`;
}
