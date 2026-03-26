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

/** Default Keep a Changelog section names. */
const KEEP_A_CHANGELOG_SECTIONS = [
  'Added',
  'Changed',
  'Deprecated',
  'Removed',
  'Fixed',
  'Security',
];

/**
 * Options for changelog structure enforcement.
 *
 * @public
 * @since 0.7.0
 */
export interface ChangelogStructureOptions {
  /** Validate section headers against an allowed list. */
  enforceStructure?: boolean;
  /** Allowed section names. Defaults to Keep a Changelog standard sections. */
  sections?: string[];
}

/**
 * Validates a changelog file for release readiness.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The validator checks for a top-level changelog heading, an `[Unreleased]`
 * section, and optionally a dated entry for the requested version.
 *
 * When `structure.enforceStructure` is `true`, section headers (`### Name`)
 * are validated against the allowed list and empty sections produce warnings.
 *
 * @param changelogPath - Path to the changelog file.
 * @param version - Version that must be present in the changelog.
 * @param strict - Whether to require compare links and dated release headings.
 * @param requireEntry - Whether the requested version must already have an entry.
 * @param structure - Optional structure enforcement options.
 * @returns The result of validating the changelog file.
 * @example
 * ```ts
 * import { validateChangelog } from 'versionguard';
 *
 * const result = validateChangelog('CHANGELOG.md', '1.2.0', true, true, {
 *   enforceStructure: true,
 *   sections: ['Added', 'Changed', 'Fixed'],
 * });
 * ```
 */
export function validateChangelog(
  changelogPath: string,
  version: string,
  strict: boolean = true,
  requireEntry: boolean = true,
  structure?: ChangelogStructureOptions,
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

  // Section structure enforcement
  if (structure?.enforceStructure) {
    const allowed = structure.sections ?? KEEP_A_CHANGELOG_SECTIONS;
    const sectionErrors = validateSections(content, allowed);
    errors.push(...sectionErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    hasEntryForVersion,
  };
}

/**
 * Validates that all `### SectionName` headers use allowed names
 * and flags empty sections.
 */
function validateSections(content: string, allowed: string[]): string[] {
  const errors: string[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const sectionMatch = lines[i].match(/^### (.+)/);
    if (!sectionMatch) continue;

    const sectionName = sectionMatch[1].trim();

    // Check against allowed list
    if (!allowed.includes(sectionName)) {
      errors.push(
        `Invalid changelog section "### ${sectionName}" (line ${i + 1}). Allowed: ${allowed.join(', ')}`,
      );
    }

    // Detect empty sections: next non-blank line is another heading or EOF
    const nextContentLine = lines.slice(i + 1).find((l) => l.trim().length > 0);
    if (!nextContentLine || nextContentLine.startsWith('#')) {
      errors.push(`Empty changelog section "### ${sectionName}" (line ${i + 1})`);
    }
  }

  return errors;
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

/**
 * Detects whether a changelog has been mangled by Changesets.
 *
 * @remarks
 * Changesets prepends version content above the Keep a Changelog preamble,
 * producing `## 0.4.0` (no brackets, no date) before the "All notable changes"
 * paragraph. This function detects that pattern.
 *
 * @param changelogPath - Path to the changelog file.
 * @returns `true` when the changelog appears to be mangled by Changesets.
 *
 * @example
 * ```ts
 * import { isChangesetMangled } from 'versionguard';
 *
 * if (isChangesetMangled('CHANGELOG.md')) {
 *   fixChangesetMangling('CHANGELOG.md');
 * }
 * ```
 *
 * @public
 * @since 0.4.0
 */
export function isChangesetMangled(changelogPath: string): boolean {
  if (!fs.existsSync(changelogPath)) return false;
  const content = fs.readFileSync(changelogPath, 'utf-8');
  // Mangled pattern: has an unbracketed version header (## X.Y.Z without [])
  // appearing before ## [Unreleased]
  return /^## \d+\.\d+/m.test(content) && content.includes('## [Unreleased]');
}

/** Maps Changesets section names to Keep a Changelog section names. */
const SECTION_MAP: Record<string, string> = {
  'Major Changes': 'Changed',
  'Minor Changes': 'Added',
  'Patch Changes': 'Fixed',
};

/**
 * Fixes a Changesets-mangled changelog into proper Keep a Changelog format.
 *
 * @remarks
 * This function:
 * 1. Extracts the version number and content prepended by Changesets
 * 2. Converts Changesets section names (Minor Changes, Patch Changes) to
 *    Keep a Changelog names (Added, Fixed)
 * 3. Strips commit hashes from entry lines
 * 4. Adds the date and brackets to the version header
 * 5. Inserts the entry after `## [Unreleased]` in the correct position
 * 6. Restores the preamble to its proper location
 *
 * @param changelogPath - Path to the changelog file to fix.
 * @param date - Release date in `YYYY-MM-DD` format.
 * @returns `true` when the file was modified, `false` when no fix was needed.
 *
 * @example
 * ```ts
 * import { fixChangesetMangling } from 'versionguard';
 *
 * const fixed = fixChangesetMangling('CHANGELOG.md');
 * ```
 *
 * @public
 * @since 0.4.0
 */
export function fixChangesetMangling(
  changelogPath: string,
  date: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (!fs.existsSync(changelogPath)) return false;

  const content = fs.readFileSync(changelogPath, 'utf-8');

  // Find the unbracketed version header that Changesets creates
  const versionMatch = content.match(/^## (\d+\.\d+\.\d+[^\n]*)\n/m);
  if (!versionMatch || versionMatch.index === undefined) return false;

  // If the version already has brackets, it's not mangled
  const fullHeader = versionMatch[0];
  if (fullHeader.includes('[')) return false;

  const version = versionMatch[1].trim();

  // Already has a proper bracketed entry for this version — skip
  if (content.includes(`## [${version}]`)) return false;

  // Extract the Changesets content block (from ## X.Y.Z to the preamble or ## [Unreleased])
  const startIndex = versionMatch.index;
  const preambleMatch = content.indexOf('All notable changes', startIndex);
  const unreleasedMatch = content.indexOf('## [Unreleased]', startIndex);

  // Determine where the Changesets block ends
  let endIndex: number;
  if (preambleMatch !== -1 && preambleMatch < unreleasedMatch) {
    endIndex = preambleMatch;
  } else if (unreleasedMatch !== -1) {
    endIndex = unreleasedMatch;
  } else {
    return false; // Can't determine structure
  }

  // Extract and transform the Changesets content
  const changesetsBlock = content.slice(startIndex + fullHeader.length, endIndex).trim();
  const transformedSections = transformChangesetsContent(changesetsBlock);

  // Build the new entry
  const newEntry = `## [${version}] - ${date}\n\n${transformedSections}\n\n`;

  // Reconstruct the file:
  // 1. Everything before the Changesets insertion (# Changelog\n\n)
  const beforeChangesets = content.slice(0, startIndex);
  // 2. Everything from the preamble or [Unreleased] onward
  const afterChangesets = content.slice(endIndex);

  // Find ## [Unreleased] in the after section and insert our entry right after it
  const unreleasedInAfter = afterChangesets.indexOf('## [Unreleased]');
  if (unreleasedInAfter === -1) {
    // No [Unreleased] section — just put the entry at the start of the remaining content
    const rebuilt = `${beforeChangesets}${newEntry}${afterChangesets}`;
    fs.writeFileSync(changelogPath, rebuilt, 'utf-8');
    return true;
  }

  // Find the end of the [Unreleased] line
  const unreleasedLineEnd = afterChangesets.indexOf('\n', unreleasedInAfter);
  const afterUnreleased =
    unreleasedLineEnd !== -1 ? afterChangesets.slice(0, unreleasedLineEnd + 1) : afterChangesets;
  const rest = unreleasedLineEnd !== -1 ? afterChangesets.slice(unreleasedLineEnd + 1) : '';

  const rebuilt = `${beforeChangesets}${afterUnreleased}\n${newEntry}${rest}`;

  // Update compare links
  const withLinks = updateCompareLinks(rebuilt, version);

  fs.writeFileSync(changelogPath, withLinks, 'utf-8');
  return true;
}

/**
 * Transforms Changesets-style content into Keep a Changelog sections.
 *
 * Converts "### Minor Changes" → "### Added", strips commit hashes, etc.
 */
function transformChangesetsContent(block: string): string {
  const lines = block.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Transform section headers
    const sectionMatch = line.match(/^### (.+)/);
    if (sectionMatch) {
      const mapped = SECTION_MAP[sectionMatch[1]] ?? sectionMatch[1];
      result.push(`### ${mapped}`);
      continue;
    }

    // Strip commit hashes from entries: "- abc1234: feat: description" → "- description"
    const entryMatch = line.match(
      /^(\s*-\s+)[a-f0-9]{7,}: (?:feat|fix|chore|docs|refactor|perf|test|ci|build|style)(?:\([^)]*\))?: (.+)/,
    );
    if (entryMatch) {
      result.push(`${entryMatch[1]}${entryMatch[2]}`);
      continue;
    }

    // Strip commit hashes without conventional commit prefix: "- abc1234: description"
    const simpleHashMatch = line.match(/^(\s*-\s+)[a-f0-9]{7,}: (.+)/);
    if (simpleHashMatch) {
      result.push(`${simpleHashMatch[1]}${simpleHashMatch[2]}`);
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Updates the compare links section at the bottom of the changelog.
 */
function updateCompareLinks(content: string, version: string): string {
  // Update [Unreleased] compare link to point to new version
  const unreleasedLinkRegex = /\[Unreleased\]: (https:\/\/[^\s]+\/compare\/v)([\d.]+)(\.\.\.HEAD)/;
  const match = content.match(unreleasedLinkRegex);
  if (match) {
    const baseUrl = match[1].replace(/v$/, '');
    const previousVersion = match[2];
    const newUnreleasedLink = `[Unreleased]: ${baseUrl}v${version}...HEAD`;
    const newVersionLink = `[${version}]: ${baseUrl}v${previousVersion}...v${version}`;

    let updated = content.replace(unreleasedLinkRegex, newUnreleasedLink);
    // Add the new version link if it doesn't exist
    if (!updated.includes(`[${version}]:`)) {
      updated = updated.replace(newUnreleasedLink, `${newUnreleasedLink}\n${newVersionLink}`);
    }
    return updated;
  }

  return content;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
