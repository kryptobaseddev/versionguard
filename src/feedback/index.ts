import * as calver from '../calver';
import * as semver from '../semver';

import type { CalVer, CalVerConfig, ValidationError, VersionGuardConfig } from '../types';

/**
 * Feedback helpers that turn validation failures into actionable suggestions.
 *
 * @packageDocumentation
 * @public
 */

/**
 * Feedback entry point exports for suggestion and guidance helpers.
 *
 * @packageDocumentation
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface Suggestion {
  /**
   * Human-readable guidance for the user.
   */
  message: string;

  /**
   * Command or action text that can be used to address the issue.
   *
   * @defaultValue `undefined`
   */
  fix?: string;

  /**
   * Indicates whether VersionGuard can apply the suggestion automatically.
   */
  autoFixable: boolean;
}

/**
 * Aggregates validation errors with suggested next steps.
 *
 * @public
 * @since 0.1.0
 */
export interface FeedbackResult {
  /**
   * Indicates whether the inspected version state is valid.
   */
  valid: boolean;

  /**
   * Validation errors collected during the check.
   */
  errors: ValidationError[];

  /**
   * Suggested next steps for resolving the reported issues.
   */
  suggestions: Suggestion[];

  /**
   * Indicates whether at least one suggestion can be auto-applied.
   */
  canAutoFix: boolean;
}

/**
 * Generates actionable feedback for a version string.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper dispatches to the SemVer or CalVer feedback flow based on the
 * configured versioning strategy and returns both hard validation errors and
 * softer suggestions for likely fixes.
 *
 * @param version - Version string to evaluate.
 * @param config - Loaded VersionGuard configuration.
 * @param previousVersion - Optional previous version used for progression checks.
 * @returns A feedback object with validation errors and suggested fixes.
 *
 * @example
 * ```typescript
 * const feedbackResult = getVersionFeedback('1.2.3', config, '1.2.2');
 * console.log(feedbackResult.valid);
 * ```
 */
export function getVersionFeedback(
  version: string,
  config: VersionGuardConfig,
  previousVersion?: string,
): FeedbackResult {
  if (config.versioning.type === 'semver') {
    return getSemVerFeedback(version, previousVersion);
  }

  return getCalVerFeedback(version, getCalVerConfig(config), previousVersion);
}

function getCalVerConfig(config: VersionGuardConfig): CalVerConfig {
  if (!config.versioning.calver) {
    throw new Error('CalVer configuration is required when versioning.type is "calver"');
  }

  return config.versioning.calver;
}

function getSemVerFeedback(version: string, previousVersion?: string): FeedbackResult {
  const errors: ValidationError[] = [];
  const suggestions: Suggestion[] = [];

  // Try to parse
  const parsed = semver.parse(version);

  if (!parsed) {
    const validation = semver.validate(version);

    // Common mistakes
    if (version.startsWith('v')) {
      const cleanVersion = version.slice(1);
      errors.push({
        message: `Version should not start with 'v': ${version}`,
        severity: 'error',
      });
      suggestions.push({
        message: `Remove the 'v' prefix`,
        fix: `npm version ${cleanVersion}`,
        autoFixable: true,
      });
    } else if (version.split('.').length === 2) {
      errors.push({
        message: `Version missing patch number: ${version}`,
        severity: 'error',
      });
      suggestions.push({
        message: `Add patch number (e.g., ${version}.0)`,
        fix: `npm version ${version}.0`,
        autoFixable: true,
      });
    } else if (/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
      errors.push({
        message: `Version has too many segments: ${version}`,
        severity: 'error',
      });
      suggestions.push({
        message: `Use only 3 segments (MAJOR.MINOR.PATCH)`,
        autoFixable: false,
      });
    } else if (validation.errors.some((error) => error.message.includes('leading zero'))) {
      errors.push(...validation.errors);
      suggestions.push({
        message: `Remove leading zeros (e.g., 1.2.3 instead of 01.02.03)`,
        autoFixable: false,
      });
    } else {
      errors.push(
        ...(validation.errors.length > 0
          ? validation.errors
          : [
              {
                message: `Invalid SemVer format: ${version}`,
                severity: 'error' as const,
              },
            ]),
      );
      suggestions.push({
        message: `Use format: MAJOR.MINOR.PATCH (e.g., 1.0.0)`,
        autoFixable: false,
      });
    }

    return {
      valid: false,
      errors,
      suggestions,
      canAutoFix: suggestions.some((s) => s.autoFixable),
    };
  }

  // Check progression from previous version
  if (previousVersion) {
    const prevParsed = semver.parse(previousVersion);
    if (prevParsed) {
      const comparison = semver.compare(version, previousVersion);

      if (comparison < 0) {
        errors.push({
          message: `Version ${version} is older than previous ${previousVersion}`,
          severity: 'error',
        });
        suggestions.push({
          message: `Version must be greater than ${previousVersion}`,
          fix: `npm version ${semver.increment(previousVersion, 'patch')}`,
          autoFixable: true,
        });
      } else if (comparison === 0) {
        errors.push({
          message: `Version ${version} is the same as previous`,
          severity: 'error',
        });
        suggestions.push({
          message: `Bump the version`,
          fix: `npm version ${semver.increment(previousVersion, 'patch')}`,
          autoFixable: true,
        });
      } else {
        // Check if it's a reasonable jump
        const majorJump = parsed.major - prevParsed.major;
        const minorJump = parsed.minor - prevParsed.minor;
        const patchJump = parsed.patch - prevParsed.patch;

        if (majorJump > 1) {
          suggestions.push({
            message: `⚠️  Major version jumped by ${majorJump} (from ${previousVersion} to ${version})`,
            autoFixable: false,
          });
        }

        if (minorJump > 10) {
          suggestions.push({
            message: `⚠️  Minor version jumped by ${minorJump} - did you mean to do a major bump?`,
            autoFixable: false,
          });
        }

        if (patchJump > 20) {
          suggestions.push({
            message: `⚠️  Patch version jumped by ${patchJump} - consider a minor bump instead`,
            autoFixable: false,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    suggestions,
    canAutoFix: suggestions.some((s) => s.autoFixable),
  };
}

function getCalVerFeedback(
  version: string,
  calverConfig: CalVerConfig,
  previousVersion?: string,
): FeedbackResult {
  const errors: ValidationError[] = [];
  const suggestions: Suggestion[] = [];
  const { format, preventFutureDates } = calverConfig;

  const parsed = calver.parse(version, format);

  if (!parsed) {
    errors.push({
      message: `Invalid CalVer format: ${version}`,
      severity: 'error',
    });
    suggestions.push({
      message: `Expected format: ${format}`,
      fix: `Update package.json to use current date: "${calver.getCurrentVersion(format)}"`,
      autoFixable: true,
    });
    return { valid: false, errors, suggestions, canAutoFix: true };
  }

  const validation = calver.validate(version, format, preventFutureDates);
  errors.push(...validation.errors);

  const now = new Date();
  if (validation.errors.some((error) => error.message.startsWith('Invalid month:'))) {
    suggestions.push({
      message: `Month must be between 1-12`,
      autoFixable: false,
    });
  }

  if (validation.errors.some((error) => error.message.startsWith('Invalid day:'))) {
    suggestions.push({
      message: `Day must be valid for the selected month`,
      autoFixable: false,
    });
  }

  if (preventFutureDates && parsed.year > now.getFullYear()) {
    suggestions.push({
      message: `Use current year (${now.getFullYear()}) or a past year`,
      fix: `npm version ${formatCalVerVersion({ ...parsed, year: now.getFullYear() })}`,
      autoFixable: true,
    });
  }

  if (
    preventFutureDates &&
    parsed.year === now.getFullYear() &&
    parsed.month > now.getMonth() + 1
  ) {
    suggestions.push({
      message: `Current month is ${now.getMonth() + 1}`,
      fix: `npm version ${formatCalVerVersion({ ...parsed, month: now.getMonth() + 1 })}`,
      autoFixable: true,
    });
  }

  if (
    preventFutureDates &&
    parsed.year === now.getFullYear() &&
    parsed.month === now.getMonth() + 1 &&
    parsed.day !== undefined &&
    parsed.day > now.getDate()
  ) {
    suggestions.push({
      message: `Current day is ${now.getDate()}`,
      fix: `npm version ${formatCalVerVersion({ ...parsed, day: now.getDate() })}`,
      autoFixable: true,
    });
  }

  // Check progression
  if (previousVersion) {
    const prevParsed = calver.parse(previousVersion, format);
    if (prevParsed) {
      if (calver.compare(version, previousVersion, format) <= 0) {
        errors.push({
          message: `Version ${version} is not newer than previous ${previousVersion}`,
          severity: 'error',
        });
        suggestions.push({
          message: `CalVer must increase over time`,
          fix: `npm version ${calver.increment(previousVersion, format)}`,
          autoFixable: true,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    suggestions,
    canAutoFix: suggestions.some((s) => s.autoFixable),
  };
}

function formatCalVerVersion(version: CalVer): string {
  return calver.format({
    ...version,
    raw: version.raw || '',
  });
}

/**
 * Generates suggestions for version sync mismatches in a file.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The returned suggestions include a general sync command and may include
 * file-type-specific hints for markdown or source files.
 *
 * @param file - File containing the mismatched version string.
 * @param foundVersion - Version currently found in the file.
 * @param expectedVersion - Version that should appear in the file.
 * @returns Suggestions for resolving the mismatch.
 *
 * @example
 * ```typescript
 * const suggestions = getSyncFeedback('README.md', '1.0.0', '1.0.1');
 * console.log(suggestions[0]?.message);
 * ```
 */
export function getSyncFeedback(
  file: string,
  foundVersion: string,
  expectedVersion: string,
): Suggestion[] {
  const suggestions: Suggestion[] = [
    {
      message: `${file} has version "${foundVersion}" but should be "${expectedVersion}"`,
      fix: `npx versionguard sync`,
      autoFixable: true,
    },
  ];

  // Common patterns
  if (file.endsWith('.md')) {
    suggestions.push({
      message: `For markdown files, check headers like "## [${expectedVersion}]"`,
      autoFixable: false,
    });
  }

  if (file.endsWith('.ts') || file.endsWith('.js')) {
    suggestions.push({
      message: `For code files, check constants like "export const VERSION = '${expectedVersion}'"`,
      autoFixable: false,
    });
  }

  return suggestions;
}

/**
 * Generates suggestions for changelog-related validation issues.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper suggests either creating a missing entry or reconciling the latest
 * changelog version with the package version.
 *
 * @param hasEntry - Whether the changelog already contains an entry for the version.
 * @param version - Package version that should appear in the changelog.
 * @param latestChangelogVersion - Most recent version currently found in the changelog.
 * @returns Suggestions for bringing changelog state back into sync.
 *
 * @example
 * ```typescript
 * const suggestions = getChangelogFeedback(false, '1.2.3', '1.2.2');
 * console.log(suggestions.length > 0);
 * ```
 */
export function getChangelogFeedback(
  hasEntry: boolean,
  version: string,
  latestChangelogVersion?: string,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (!hasEntry) {
    suggestions.push({
      message: `CHANGELOG.md is missing entry for version ${version}`,
      fix: `npx versionguard fix`,
      autoFixable: true,
    });

    suggestions.push({
      message: `Or manually add: "## [${version}] - YYYY-MM-DD" under [Unreleased]`,
      autoFixable: false,
    });
  }

  if (latestChangelogVersion && latestChangelogVersion !== version) {
    suggestions.push({
      message: `CHANGELOG.md latest entry is ${latestChangelogVersion}, but package.json is ${version}`,
      fix: `Make sure versions are in sync`,
      autoFixable: false,
    });
  }

  return suggestions;
}

/**
 * Generates suggestions for git tag mismatches.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper focuses on discrepancies between git tag versions, package.json,
 * and repository files that still need to be synchronized.
 *
 * @param tagVersion - Version represented by the git tag.
 * @param packageVersion - Version currently stored in `package.json`.
 * @param hasUnsyncedFiles - Whether repository files are still out of sync.
 * @returns Suggestions for correcting tag-related issues.
 *
 * @example
 * ```typescript
 * const suggestions = getTagFeedback('v1.2.2', '1.2.3', true);
 * console.log(suggestions.map((item) => item.message));
 * ```
 */
export function getTagFeedback(
  tagVersion: string,
  packageVersion: string,
  hasUnsyncedFiles: boolean,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (tagVersion !== packageVersion) {
    suggestions.push({
      message: `Git tag "${tagVersion}" doesn't match package.json "${packageVersion}"`,
      fix: `Delete tag and recreate: git tag -d ${tagVersion} && git tag ${packageVersion}`,
      autoFixable: false,
    });
  }

  if (hasUnsyncedFiles) {
    suggestions.push({
      message: `Files are out of sync with version ${packageVersion}`,
      fix: `npx versionguard sync`,
      autoFixable: true,
    });
  }

  return suggestions;
}
