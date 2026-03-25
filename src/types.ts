/**
 * Shared public types for version parsing, validation, and configuration.
 *
 * @packageDocumentation
 */

/**
 * Supported versioning strategies.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export type VersioningType = 'semver' | 'calver';

/**
 * Supported manifest source types for version extraction.
 *
 * @public
 * @since 0.3.0
 * @forgeIgnore E020
 */
export type ManifestSourceType =
  | 'auto'
  | 'package.json'
  | 'composer.json'
  | 'Cargo.toml'
  | 'pyproject.toml'
  | 'pubspec.yaml'
  | 'pom.xml'
  | 'VERSION'
  | 'git-tag'
  | 'custom';

/**
 * Configures the version source manifest.
 *
 * @public
 * @since 0.3.0
 * @forgeIgnore E020
 */
export interface ManifestConfig {
  /**
   * Manifest file to read the version from.
   *
   * Use `'auto'` for file-existence detection or a specific filename.
   *
   * @defaultValue 'auto'
   */
  source: ManifestSourceType;

  /**
   * Dotted key path to the version field within the manifest.
   *
   * For example `'version'` for package.json, `'package.version'` for Cargo.toml,
   * or `'project.version'` for pyproject.toml.
   *
   * @defaultValue undefined (uses the provider's built-in default)
   */
  path?: string;

  /**
   * Regex pattern to extract the version from source-code manifests.
   *
   * Capture group 1 must contain the version string.
   *
   * @defaultValue undefined
   */
  regex?: string;
}

/**
 * Supported calendar version string layouts.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export type CalVerFormat = 'YYYY.MM.DD' | 'YYYY.MM.PATCH' | 'YY.M.PATCH' | 'YYYY.0M.0D';

/**
 * Configures CalVer validation rules.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface CalVerConfig {
  /**
   * Calendar format used when parsing and validating versions.
   */
  format: CalVerFormat;

  /**
   * Rejects versions that point to a future date.
   *
   * @defaultValue true
   */
  preventFutureDates: boolean;
}

/**
 * Describes a search-and-replace pattern used during version synchronization.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface SyncPattern {
  /**
   * Regular expression string used to locate a version value.
   */
  regex: string;

  /**
   * Replacement template applied when a match is updated.
   */
  template: string;
}

/**
 * Configures files and patterns that should stay in sync with the canonical version.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface SyncConfig {
  /**
   * File globs or paths that should be scanned for version updates.
   */
  files: string[];

  /**
   * Replacement patterns applied to matching files.
   */
  patterns: SyncPattern[];
}

/**
 * Controls changelog validation behavior.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface ChangelogConfig {
  /**
   * Enables changelog validation.
   *
   * @defaultValue false
   */
  enabled: boolean;

  /**
   * Path to the changelog file to inspect.
   */
  file: string;

  /**
   * Treats changelog problems as hard failures.
   *
   * @defaultValue false
   */
  strict: boolean;

  /**
   * Requires an entry for the current version.
   *
   * @defaultValue false
   */
  requireEntry: boolean;
}

/**
 * Toggles each supported git hook integration.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface GitHooksConfig {
  /**
   * Enables validation during the `pre-commit` hook.
   *
   * @defaultValue false
   */
  'pre-commit': boolean;

  /**
   * Enables validation during the `pre-push` hook.
   *
   * @defaultValue false
   */
  'pre-push': boolean;

  /**
   * Enables follow-up tasks after a tag is created.
   *
   * @defaultValue false
   */
  'post-tag': boolean;
}

/**
 * Configures git-related enforcement.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface GitConfig {
  /**
   * Hook toggles used by the CLI and validation workflow.
   */
  hooks: GitHooksConfig;

  /**
   * Fails validation when required hooks are missing.
   *
   * @defaultValue false
   */
  enforceHooks: boolean;
}

/**
 * Configures the active versioning mode.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface VersioningConfig {
  /**
   * Versioning strategy used for the project.
   */
  type: VersioningType;

  /**
   * CalVer-specific settings when `type` is `'calver'`.
   *
   * @defaultValue undefined
   */
  calver?: CalVerConfig;
}

/**
 * Top-level configuration consumed by versionguard.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface VersionGuardConfig {
  /**
   * Active versioning settings.
   */
  versioning: VersioningConfig;

  /**
   * Version source manifest settings.
   *
   * @defaultValue `{ source: 'auto' }`
   */
  manifest: ManifestConfig;

  /**
   * Synchronization settings for mirrored version strings.
   */
  sync: SyncConfig;

  /**
   * Changelog validation settings.
   */
  changelog: ChangelogConfig;

  /**
   * Git enforcement settings.
   */
  git: GitConfig;

  /**
   * Files or patterns excluded from validation.
   */
  ignore: string[];
}

/**
 * Parsed semantic version components.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface SemVer {
  /**
   * Major version number.
   */
  major: number;

  /**
   * Minor version number.
   */
  minor: number;

  /**
   * Patch version number.
   */
  patch: number;

  /**
   * Ordered prerelease identifiers.
   *
   * @defaultValue []
   */
  prerelease: string[];

  /**
   * Ordered build metadata identifiers.
   *
   * @defaultValue []
   */
  build: string[];

  /**
   * Original version string.
   */
  raw: string;
}

/**
 * Parsed calendar version components.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface CalVer {
  /**
   * Four-digit year value.
   */
  year: number;

  /**
   * Month value from 1 through 12.
   */
  month: number;

  /**
   * Day-of-month value when the selected format includes a day token.
   *
   * @defaultValue undefined
   */
  day?: number;

  /**
   * Patch counter when the selected format includes a patch token.
   *
   * @defaultValue undefined
   */
  patch?: number;

  /**
   * Source format used to interpret the raw string.
   */
  format: CalVerFormat;

  /**
   * Original version string.
   */
  raw: string;
}

/**
 * Parsed semantic version result wrapper.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface ParsedSemVer {
  /**
   * Discriminator for semantic version results.
   */
  type: 'semver';

  /**
   * Parsed semantic version value.
   */
  version: SemVer;
}

/**
 * Parsed calendar version result wrapper.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface ParsedCalVer {
  /**
   * Discriminator for calendar version results.
   */
  type: 'calver';

  /**
   * Parsed calendar version value.
   */
  version: CalVer;
}

/**
 * Union of supported parsed version payloads.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export type ParsedVersion = ParsedSemVer | ParsedCalVer;

/**
 * Describes a single validation problem.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface ValidationError {
  /**
   * Source file associated with the error when available.
   *
   * @defaultValue undefined
   */
  file?: string;

  /**
   * One-based source line associated with the error when available.
   *
   * @defaultValue undefined
   */
  line?: number;

  /**
   * Human-readable validation message.
   */
  message: string;

  /**
   * Severity of the reported problem.
   */
  severity: 'error' | 'warning';
}

/**
 * Result returned by version parsing and validation helpers.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface ValidationResult {
  /**
   * Indicates whether validation completed without errors.
   */
  valid: boolean;

  /**
   * Collected validation issues.
   */
  errors: ValidationError[];

  /**
   * Parsed version details when validation succeeds.
   *
   * @defaultValue undefined
   */
  version?: ParsedVersion;
}

/**
 * Describes a single in-file version replacement.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface SyncChange {
  /**
   * One-based line number where the replacement occurred.
   */
  line: number;

  /**
   * Previously matched value.
   */
  oldValue: string;

  /**
   * Replacement value written to the file.
   */
  newValue: string;
}

/**
 * Reports the result of synchronizing a single file.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface SyncResult {
  /**
   * File that was inspected or updated.
   */
  file: string;

  /**
   * Indicates whether the file content changed.
   */
  updated: boolean;

  /**
   * Detailed replacements applied within the file.
   */
  changes: SyncChange[];
}

/**
 * Reports a discovered version mismatch.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface VersionMismatch {
  /**
   * File containing the mismatched value.
   */
  file: string;

  /**
   * One-based line number of the mismatch.
   */
  line: number;

  /**
   * Version string found in the file.
   */
  found: string;
}

/**
 * Combined result from a full project validation run.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface FullValidationResult {
  /**
   * Indicates whether all checks passed.
   */
  valid: boolean;

  /**
   * Canonical version string used for validation.
   */
  version: string;

  /**
   * Indicates whether the root version string is valid.
   */
  versionValid: boolean;

  /**
   * Indicates whether synchronized files are in sync.
   */
  syncValid: boolean;

  /**
   * Indicates whether changelog checks passed.
   */
  changelogValid: boolean;

  /**
   * Human-readable validation failures collected during the run.
   */
  errors: string[];
}

/**
 * Reports whether a project is ready to pass VersionGuard checks.
 *
 * @packageDocumentation
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface DoctorReport {
  /**
   * Indicates whether all doctor checks passed.
   */
  ready: boolean;

  /**
   * Package version resolved from the configured manifest source.
   */
  version: string;

  /**
   * Indicates whether the package version matches the configured scheme.
   */
  versionValid: boolean;

  /**
   * Indicates whether synced files match the package version.
   */
  syncValid: boolean;

  /**
   * Indicates whether changelog validation passed.
   */
  changelogValid: boolean;

  /**
   * Indicates whether the current working directory is inside a Git repository.
   */
  gitRepository: boolean;

  /**
   * Indicates whether VersionGuard-managed Git hooks are installed.
   */
  hooksInstalled: boolean;

  /**
   * Indicates whether `git status --porcelain` reports a clean worktree.
   */
  worktreeClean: boolean;

  /**
   * Human-readable validation and readiness errors.
   */
  errors: string[];
}
