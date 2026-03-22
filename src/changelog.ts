import * as fs from 'node:fs';

/**
 * Describes the outcome of validating a changelog file.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface ChangelogValidationResult {
  /**
   * Indicates whether the changelog satisfies all requested checks.
   */
  valid: boolean;
  /**
   * Human-readable validation errors.
   */
  errors: string[];
  /**
   * Indicates whether the changelog contains an entry for the requested version.
   */
  hasEntryForVersion: boolean;
}

const CHANGELOG_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a changelog file for release readiness.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The validator checks for a top-level changelog heading, an `[Unreleased]`
 * section, and optionally a dated entry for the requested version.
 *
 * @param changelogPath - Path to the changelog file.
 * @param version - Version that must be present in the changelog.
 * @param strict - Whether to require compare links and dated release headings.
 * @param requireEntry - Whether the requested version must already have an entry.
 * @returns The result of validating the changelog file.
 * @example
 * ```ts
 * import { validateChangelog } from 'versionguard';
 *
 * const result = validateChangelog('CHANGELOG.md', '1.2.0', true, true);
 * ```
 */
export function validateChangelog(
  changelogPath: string,
  version: string,
  strict: boolean = true,
  requireEntry: boolean = true,
): ChangelogValidationResult {
  if (!fs.existsSync(changelogPath)) {
    return {
      valid: !requireEntry,
      errors: requireEntry ? [`Changelog not found: ${changelogPath}`] : [],
      hasEntryForVersion: false,
    };
  }

  const errors: string[] = [];
  const content = fs.readFileSync(changelogPath, 'utf-8');

  if (!content.startsWith('# Changelog')) {
    errors.push('Changelog must start with "# Changelog"');
  }

  if (!content.includes('## [Unreleased]')) {
    errors.push('Changelog must have an [Unreleased] section');
  }

  const versionHeader = `## [${version}]`;
  const hasEntryForVersion = content.includes(versionHeader);
  if (requireEntry && !hasEntryForVersion) {
    errors.push(`Changelog must have an entry for version ${version}`);
  }

  if (strict) {
    if (!content.includes('[Unreleased]:')) {
      errors.push('Changelog should include compare links at the bottom');
    }

    const versionHeaderMatch = content.match(
      new RegExp(`## \\[${escapeRegExp(version)}\\] - ([^\r\n]+)`),
    );
    if (requireEntry && hasEntryForVersion) {
      if (!versionHeaderMatch) {
        errors.push(`Version ${version} entry must use "## [${version}] - YYYY-MM-DD" format`);
      } else if (!CHANGELOG_DATE_REGEX.test(versionHeaderMatch[1])) {
        errors.push(`Version ${version} entry date must use YYYY-MM-DD format`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    hasEntryForVersion,
  };
}

/**
 * Gets the most recent released version from a changelog.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The `[Unreleased]` section is skipped so the first concrete version heading is
 * treated as the latest release.
 *
 * @param changelogPath - Path to the changelog file.
 * @returns The latest released version, or `null` when no release entry exists.
 * @example
 * ```ts
 * import { getLatestVersion } from 'versionguard';
 *
 * const latest = getLatestVersion('CHANGELOG.md');
 * ```
 */
export function getLatestVersion(changelogPath: string): string | null {
  if (!fs.existsSync(changelogPath)) {
    return null;
  }

  const content = fs.readFileSync(changelogPath, 'utf-8');
  const match = content.match(/^## \[(?!Unreleased\])(.*?)\]/m);
  return match?.[1] ?? null;
}

/**
 * Inserts a new version entry beneath the `[Unreleased]` section.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * If the changelog already contains the requested version, no changes are made.
 * The inserted entry includes a starter `Added` subsection for follow-up edits.
 *
 * @param changelogPath - Path to the changelog file.
 * @param version - Version to add.
 * @param date - Release date to write in `YYYY-MM-DD` format.
 * @example
 * ```ts
 * import { addVersionEntry } from 'versionguard';
 *
 * addVersionEntry('CHANGELOG.md', '1.2.0', '2026-03-21');
 * ```
 */
export function addVersionEntry(
  changelogPath: string,
  version: string,
  date: string = new Date().toISOString().slice(0, 10),
): void {
  if (!fs.existsSync(changelogPath)) {
    throw new Error(`Changelog not found: ${changelogPath}`);
  }

  const content = fs.readFileSync(changelogPath, 'utf-8');
  if (content.includes(`## [${version}]`)) {
    return;
  }

  const block = `## [${version}] - ${date}\n\n### Added\n\n- Describe changes here.\n\n`;
  const unreleasedMatch = content.match(/## \[Unreleased\]\r?\n(?:\r?\n)?/);
  if (!unreleasedMatch || unreleasedMatch.index === undefined) {
    throw new Error('Changelog must have an [Unreleased] section');
  }

  const insertIndex = unreleasedMatch.index + unreleasedMatch[0].length;
  const updated = `${content.slice(0, insertIndex)}${block}${content.slice(insertIndex)}`;
  fs.writeFileSync(changelogPath, updated, 'utf-8');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
