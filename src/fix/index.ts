import * as fs from 'node:fs';
import * as path from 'node:path';

import * as calver from '../calver';
import { addVersionEntry } from '../changelog';
import { getPackageVersion, getVersionSource, setPackageVersion } from '../project';
import * as semver from '../semver';
import { syncVersion } from '../sync';
import { getCalVerConfig, type ManifestConfig, type VersionGuardConfig } from '../types';

/**
 * Auto-fix helpers for package versions, synced files, and changelog entries.
 *
 * @packageDocumentation
 * @public
 */

/**
 * Fix entry point exports for auto-remediation helpers.
 *
 * @packageDocumentation
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface FixResult {
  /**
   * Indicates whether the operation changed repository state.
   */
  fixed: boolean;

  /**
   * Human-readable description of the fix attempt.
   */
  message: string;

  /**
   * Absolute path to the file that was updated, when applicable.
   *
   * @defaultValue `undefined`
   */
  file?: string;
}

/**
 * Updates the `package.json` version field when needed.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper writes the target version only when `package.json` exists and the
 * current version differs from the requested value.
 *
 * @param targetVersion - Version that should be written to `package.json`.
 * @param cwd - Repository directory containing `package.json`.
 * @returns The result of the package version fix attempt.
 *
 * @example
 * ```typescript
 * const result = fixPackageVersion('1.2.3', process.cwd());
 * console.log(result.fixed);
 * ```
 */
export function fixPackageVersion(
  targetVersion: string,
  cwd: string = process.cwd(),
  manifest?: ManifestConfig,
): FixResult {
  // When no manifest config, use legacy package.json path for full compat
  if (!manifest) {
    const packagePath = path.join(cwd, 'package.json');

    if (!fs.existsSync(packagePath)) {
      return { fixed: false, message: 'package.json not found' };
    }

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as { version?: string };
    const oldVersion = typeof pkg.version === 'string' ? pkg.version : undefined;

    if (oldVersion === targetVersion) {
      return { fixed: false, message: `Already at version ${targetVersion}` };
    }

    setPackageVersion(targetVersion, cwd);

    return {
      fixed: true,
      message: `Updated package.json from ${oldVersion} to ${targetVersion}`,
      file: packagePath,
    };
  }

  // Language-agnostic path
  const provider = getVersionSource(manifest, cwd);
  let oldVersion: string | undefined;

  try {
    oldVersion = provider.getVersion(cwd);
  } catch {
    return { fixed: false, message: 'Version source not found' };
  }

  if (oldVersion === targetVersion) {
    return { fixed: false, message: `Already at version ${targetVersion}` };
  }

  provider.setVersion(targetVersion, cwd);

  return {
    fixed: true,
    message: `Updated version from ${oldVersion} to ${targetVersion}`,
    file: provider.manifestFile ? path.join(cwd, provider.manifestFile) : undefined,
  };
}

/**
 * Synchronizes configured files to the package version.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper uses the configured sync targets to update version strings across
 * the repository and reports only the files that changed.
 *
 * @param config - Loaded VersionGuard configuration.
 * @param cwd - Repository directory to synchronize.
 * @returns A list of per-file sync results.
 *
 * @example
 * ```typescript
 * const results = fixSyncIssues(config, process.cwd());
 * console.log(results.length);
 * ```
 */
export function fixSyncIssues(
  config: VersionGuardConfig,
  cwd: string = process.cwd(),
): FixResult[] {
  const version = getPackageVersion(cwd, config.manifest);
  const results: FixResult[] = syncVersion(version, config.sync, cwd)
    .filter((result) => result.updated)
    .map((result) => ({
      fixed: true,
      message: `Updated ${path.relative(cwd, result.file)} (${result.changes.length} changes)`,
      file: result.file,
    }));

  if (results.length === 0) {
    results.push({ fixed: false, message: 'All files already in sync' });
  }

  return results;
}

/**
 * Ensures the changelog contains an entry for a version.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * When the changelog file does not exist, this helper creates a starter changelog.
 * Otherwise it appends a new version entry only when one is missing.
 *
 * @param version - Version that should appear in the changelog.
 * @param config - Loaded VersionGuard configuration.
 * @param cwd - Repository directory containing the changelog file.
 * @returns The result of the changelog fix attempt.
 *
 * @example
 * ```typescript
 * const result = fixChangelog('1.2.3', config, process.cwd());
 * console.log(result.message);
 * ```
 */
export function fixChangelog(
  version: string,
  config: VersionGuardConfig,
  cwd: string = process.cwd(),
): FixResult {
  const changelogPath = path.join(cwd, config.changelog.file);

  if (!fs.existsSync(changelogPath)) {
    // Create initial changelog
    createInitialChangelog(changelogPath, version);
    return {
      fixed: true,
      message: `Created ${config.changelog.file} with entry for ${version}`,
      file: changelogPath,
    };
  }

  const content = fs.readFileSync(changelogPath, 'utf-8');

  if (content.includes(`## [${version}]`)) {
    return { fixed: false, message: `Changelog already has entry for ${version}` };
  }

  addVersionEntry(changelogPath, version);

  return {
    fixed: true,
    message: `Added entry for ${version} to ${config.changelog.file}`,
    file: changelogPath,
  };
}

/**
 * Create initial changelog
 */
function createInitialChangelog(changelogPath: string, version: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [${version}] - ${today}

### Added

- Initial release

[Unreleased]: https://github.com/yourorg/project/compare/v${version}...HEAD
[${version}]: https://github.com/yourorg/project/releases/tag/v${version}
`;

  fs.writeFileSync(changelogPath, content, 'utf-8');
}

/**
 * Runs all configured auto-fix operations.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper optionally updates the package version first, then synchronizes
 * configured files, and finally updates the changelog when changelog support is
 * enabled.
 *
 * @param config - Loaded VersionGuard configuration.
 * @param targetVersion - Optional version to apply before running other fixes.
 * @param cwd - Repository directory where fixes should run.
 * @returns Ordered results describing every fix step that ran.
 *
 * @example
 * ```typescript
 * const results = fixAll(config, '1.2.3', process.cwd());
 * console.log(results.some((result) => result.fixed));
 * ```
 */
export function fixAll(
  config: VersionGuardConfig,
  targetVersion?: string,
  cwd: string = process.cwd(),
): FixResult[] {
  const results: FixResult[] = [];
  const version = targetVersion || getPackageVersion(cwd, config.manifest);

  if (targetVersion && targetVersion !== getPackageVersion(cwd, config.manifest)) {
    results.push(fixPackageVersion(targetVersion, cwd, config.manifest));
  }

  const syncResults = fixSyncIssues(config, cwd);
  results.push(...syncResults);

  if (config.changelog.enabled) {
    const changelogResult = fixChangelog(version, config, cwd);
    if (changelogResult.fixed) {
      results.push(changelogResult);
    }
  }

  return results;
}

/**
 * Suggests candidate next versions for a release.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The suggestions depend on the configured versioning mode. SemVer returns one or
 * more bump options, while CalVer suggests the current date-based version and an
 * incremented same-day release.
 *
 * @param currentVersion - Current package version.
 * @param config - Loaded VersionGuard configuration.
 * @param changeType - Preferred bump type, or `auto` to include common options.
 * @returns Candidate versions paired with the reason for each suggestion.
 *
 * @example
 * ```typescript
 * const suggestions = suggestNextVersion('1.2.3', config, 'minor');
 * console.log(suggestions[0]?.version);
 * ```
 */
export function suggestNextVersion(
  currentVersion: string,
  config: VersionGuardConfig,
  changeType?: 'major' | 'minor' | 'patch' | 'auto',
): { version: string; reason: string }[] {
  const suggestions: { version: string; reason: string }[] = [];

  if (config.versioning.type === 'semver') {
    if (!changeType || changeType === 'auto' || changeType === 'patch') {
      suggestions.push({
        version: semver.increment(currentVersion, 'patch'),
        reason: 'Patch - bug fixes, small changes',
      });
    }

    if (!changeType || changeType === 'auto' || changeType === 'minor') {
      suggestions.push({
        version: semver.increment(currentVersion, 'minor'),
        reason: 'Minor - new features, backwards compatible',
      });
    }

    if (!changeType || changeType === 'auto' || changeType === 'major') {
      suggestions.push({
        version: semver.increment(currentVersion, 'major'),
        reason: 'Major - breaking changes',
      });
    }
  } else {
    // CalVer
    const format = getCalVerConfig(config).format;
    const currentCal = calver.getCurrentVersion(format);

    // Option 1: Current date
    suggestions.push({
      version: currentCal,
      reason: 'Current date - new release today',
    });

    // Option 2: Increment patch on current version
    suggestions.push({
      version: calver.increment(currentVersion, format),
      reason: 'Increment patch - additional release today',
    });
  }

  return suggestions;
}
