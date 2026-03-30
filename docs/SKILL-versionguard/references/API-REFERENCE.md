# @codluv/versionguard — API Reference

## Table of Contents

- [Functions](#functions)
- [Types](#types)
- [Classes](#classes)
- [Constants](#constants)

## Functions

### `getSemVerConfig`

Resolves the SemVer config from a VersionGuard config.

```typescript
(config: VersionGuardConfig) => SemVerConfig
```

**Parameters:**

- `config` — The full VersionGuard configuration object.

**Returns:** The resolved SemVer configuration.

```ts
import { getSemVerConfig } from './types';

const sv = getSemVerConfig(config);
console.log(sv.allowVPrefix); // false
```

### `getCalVerConfig`

Extracts the CalVer config from a VersionGuard config, throwing if missing.

```typescript
(config: VersionGuardConfig) => CalVerConfig
```

**Parameters:**

- `config` — The full VersionGuard configuration object.

**Returns:** The validated CalVer configuration.

```ts
import { getCalVerConfig } from './types';

const calver = getCalVerConfig(config);
console.log(calver.format); // 'YYYY.MM.DD'
```

### `validateModifier`

Validates a pre-release / modifier tag against the allowed modifiers list.

```typescript
(modifier: string, schemeRules?: SchemeRules) => ValidationError | null
```

**Parameters:**

- `modifier` — Raw modifier string (e.g. `"alpha.1"`, `"rc2"`, `"dev"`).
- `schemeRules` — Scheme rules containing the allowed modifiers list.

**Returns:** A validation error when the modifier is disallowed, otherwise `null`.

```ts
import { validateModifier } from './scheme-rules';

const error = validateModifier('alpha.1', { maxNumericSegments: 3, allowedModifiers: ['dev', 'alpha', 'beta', 'rc'] });
// => null (allowed)
```

### `isValidCalVerFormat`

Validates that a CalVer format string is composed of valid tokens and follows structural rules.

```typescript
(formatStr: string) => formatStr is CalVerFormat
```

**Parameters:**

- `formatStr` — Format string to validate.

**Returns:** `true` when the format is valid.

```ts
import { isValidCalVerFormat } from 'versionguard';

isValidCalVerFormat('YYYY.MM.MICRO'); // true
isValidCalVerFormat('INVALID');        // false
```

### `parseFormat`

Breaks a CalVer format string into its component tokens.

```typescript
(calverFormat: CalVerFormat) => ParsedCalVerFormat
```

**Parameters:**

- `calverFormat` — Format string to inspect.

**Returns:** The parsed token definition for the requested format.

```ts
import { parseFormat } from 'versionguard';

parseFormat('YYYY.MM.MICRO');
// => { year: 'YYYY', month: 'MM', counter: 'MICRO' }
```

### `getRegexForFormat`

Builds a regular expression that matches a supported CalVer format.

```typescript
(calverFormat: CalVerFormat) => RegExp
```

**Parameters:**

- `calverFormat` — Format string to convert into a regular expression.

**Returns:** A strict regular expression for the supplied CalVer format.

```ts
import { getRegexForFormat } from 'versionguard';

getRegexForFormat('YYYY.0M.0D').test('2026.03.21');
// => true
```

### `parse`

Parses a CalVer string using the supplied format.

```typescript
(version: string, calverFormat: CalVerFormat) => CalVer | null
```

**Parameters:**

- `version` — Version string to parse.
- `calverFormat` — Format expected for the version string.

**Returns:** Parsed CalVer components, or `null` when the string does not match the format.

```ts
import { parse } from 'versionguard';

parse('2026.3.0', 'YYYY.M.MICRO')?.month;
// => 3
```

### `validate`

Validates a CalVer string against formatting and date rules.

```typescript
(version: string, calverFormat: CalVerFormat, preventFutureDates?: boolean, schemeRules?: SchemeRules) => ValidationResult
```

**Parameters:**

- `version` — Version string to validate.
- `calverFormat` — Format expected for the version string.
- `preventFutureDates` — Whether future dates should be reported as errors.
- `schemeRules` — Optional scheme rules for modifier validation and segment count warnings.

**Returns:** A validation result containing any discovered errors and the parsed version on success.

```ts
import { validate } from 'versionguard';

validate('2026.3.0', 'YYYY.M.MICRO', false).valid;
// => true
```

### `format`

Formats a parsed CalVer object back into a version string.

```typescript
(version: CalVer) => string
```

**Parameters:**

- `version` — Parsed CalVer value to serialize.

**Returns:** The formatted CalVer string.

```ts
import { format } from 'versionguard';

const version = { year: 2026, month: 3, day: 21, format: 'YYYY.0M.0D', raw: '2026.03.21' };

format(version);
// => '2026.03.21'
```

### `getCurrentVersion`

Creates the current CalVer string for a format.

```typescript
(calverFormat: CalVerFormat, now?: Date) => string
```

**Parameters:**

- `calverFormat` — Format to generate.
- `now` — Date used as the source for year, month, and day values.

**Returns:** The current version string for the requested format.

```ts
import { getCurrentVersion } from 'versionguard';

getCurrentVersion('YYYY.M.MICRO', new Date('2026-03-21T00:00:00Z'));
// => '2026.3.0'
```

### `compare`

Compares two CalVer strings using a shared format.

```typescript
(a: string, b: string, calverFormat: CalVerFormat) => number
```

**Parameters:**

- `a` — Left-hand version string.
- `b` — Right-hand version string.
- `calverFormat` — Format used to parse both versions.

**Returns:** `1` when `a` is greater, `-1` when `b` is greater, or `0` when they are equal.

```ts
import { compare } from 'versionguard';

compare('2026.3.2', '2026.3.1', 'YYYY.M.MICRO');
// => 1
```

### `increment`

Increments a CalVer string.

```typescript
(version: string, calverFormat: CalVerFormat) => string
```

**Parameters:**

- `version` — Current version string.
- `calverFormat` — Format used to parse the current version.

**Returns:** The next version string.

```ts
import { increment } from 'versionguard';

increment('2026.3.1', 'YYYY.M.MICRO');
// => '2026.3.2'
```

### `getNextVersions`

Returns the most likely next CalVer candidates.

```typescript
(currentVersion: string, calverFormat: CalVerFormat) => string[]
```

**Parameters:**

- `currentVersion` — Existing project version.
- `calverFormat` — Format used to generate both candidates.

**Returns:** Two candidate version strings ordered as current-date then incremented version.

```ts
import { getNextVersions } from 'versionguard';

getNextVersions('2026.3.1', 'YYYY.M.MICRO').length;
// => 2
```

### `validateChangelog`

Validates a changelog file for release readiness.

```typescript
(changelogPath: string, version: string, strict?: boolean, requireEntry?: boolean, structure?: ChangelogStructureOptions) => ChangelogValidationResult
```

**Parameters:**

- `changelogPath` — Path to the changelog file.
- `version` — Version that must be present in the changelog.
- `strict` — Whether to require compare links and dated release headings.
- `requireEntry` — Whether the requested version must already have an entry.
- `structure` — Optional structure enforcement options.

**Returns:** The result of validating the changelog file.

```ts
import { validateChangelog } from 'versionguard';

const result = validateChangelog('CHANGELOG.md', '1.2.0', true, true, {
  enforceStructure: true,
  sections: ['Added', 'Changed', 'Fixed'],
});
```

### `getLatestVersion`

Gets the most recent released version from a changelog.

```typescript
(changelogPath: string) => string | null
```

**Parameters:**

- `changelogPath` — Path to the changelog file.

**Returns:** The latest released version, or `null` when no release entry exists.

```ts
import { getLatestVersion } from 'versionguard';

const latest = getLatestVersion('CHANGELOG.md');
```

### `addVersionEntry`

Inserts a new version entry beneath the `[Unreleased]` section.

```typescript
(changelogPath: string, version: string, date?: string) => void
```

**Parameters:**

- `changelogPath` — Path to the changelog file.
- `version` — Version to add.
- `date` — Release date to write in `YYYY-MM-DD` format.

```ts
import { addVersionEntry } from 'versionguard';

addVersionEntry('CHANGELOG.md', '1.2.0', '2026-03-21');
```

### `isChangesetMangled`

Detects whether a changelog has been mangled by Changesets.

```typescript
(changelogPath: string) => boolean
```

**Parameters:**

- `changelogPath` — Path to the changelog file.

**Returns:** `true` when the changelog appears to be mangled by Changesets.

```ts
import { isChangesetMangled } from 'versionguard';

if (isChangesetMangled('CHANGELOG.md')) {
  fixChangesetMangling('CHANGELOG.md');
}
```

### `fixChangesetMangling`

Fixes a Changesets-mangled changelog into proper Keep a Changelog format.

```typescript
(changelogPath: string, date?: string) => boolean
```

**Parameters:**

- `changelogPath` — Path to the changelog file to fix.
- `date` — Release date in `YYYY-MM-DD` format.

**Returns:** `true` when the file was modified, `false` when no fix was needed.

```ts
import { fixChangesetMangling } from 'versionguard';

const fixed = fixChangesetMangling('CHANGELOG.md');
```

### `parse`

Parses a semantic version string.

```typescript
(version: string) => SemVer | null
```

**Parameters:**

- `version` — Version string to parse.

**Returns:** Parsed semantic version components, or `null` when the input is invalid.

```ts
import { parse } from 'versionguard';

parse('1.2.3-alpha.1+build.5')?.prerelease;
// => ['alpha', '1']
```

### `validate`

Validates that a string is a supported semantic version.

```typescript
(version: string, semverConfig?: SemVerConfig, schemeRules?: SchemeRules) => ValidationResult
```

**Parameters:**

- `version` — Version string to validate.
- `semverConfig` — Optional SemVer-specific configuration.
- `schemeRules` — Optional scheme rules for modifier validation.

**Returns:** A validation result containing any detected errors and the parsed version on success.

```ts
import { validate } from 'versionguard';

validate('1.2.3').valid;
// => true
```

### `compare`

Compares two semantic version strings.

```typescript
(a: string, b: string) => number
```

**Parameters:**

- `a` — Left-hand version string.
- `b` — Right-hand version string.

**Returns:** `1` when `a` is greater, `-1` when `b` is greater, or `0` when they are equal.

```ts
import { compare } from 'versionguard';

compare('1.2.3', '1.2.3-alpha.1');
// => 1
```

### `gt`

Checks whether one semantic version is greater than another.

```typescript
(a: string, b: string) => boolean
```

**Parameters:**

- `a` — Left-hand version string.
- `b` — Right-hand version string.

**Returns:** `true` when `a` has higher precedence than `b`.

```ts
import { gt } from 'versionguard';

gt('1.2.4', '1.2.3');
// => true
```

### `lt`

Checks whether one semantic version is less than another.

```typescript
(a: string, b: string) => boolean
```

**Parameters:**

- `a` — Left-hand version string.
- `b` — Right-hand version string.

**Returns:** `true` when `a` has lower precedence than `b`.

```ts
import { lt } from 'versionguard';

lt('1.2.3-alpha.1', '1.2.3');
// => true
```

### `eq`

Checks whether two semantic versions are equal in precedence.

```typescript
(a: string, b: string) => boolean
```

**Parameters:**

- `a` — Left-hand version string.
- `b` — Right-hand version string.

**Returns:** `true` when both versions compare as equal.

```ts
import { eq } from 'versionguard';

eq('1.2.3', '1.2.3');
// => true
```

### `increment`

Increments a semantic version string by release type.

```typescript
(version: string, release: "major" | "minor" | "patch", prerelease?: string) => string
```

**Parameters:**

- `version` — Current semantic version string.
- `release` — Segment to increment.
- `prerelease` — Optional prerelease suffix to append to the next version.

**Returns:** The incremented semantic version string.

```ts
import { increment } from 'versionguard';

increment('1.2.3', 'minor', 'beta.1');
// => '1.3.0-beta.1'
```

### `format`

Formats a parsed semantic version object.

```typescript
(version: SemVer) => string
```

**Parameters:**

- `version` — Parsed semantic version to serialize.

**Returns:** The normalized semantic version string.

```ts
import { format } from 'versionguard';

const version = { major: 1, minor: 2, patch: 3, prerelease: ['rc', '1'], build: ['build', '5'], raw: '1.2.3-rc.1+build.5' };

format(version);
// => '1.2.3-rc.1+build.5'
```

### `getVersionFeedback`

Generates actionable feedback for a version string.

```typescript
(version: string, config: VersionGuardConfig, previousVersion?: string) => FeedbackResult
```

**Parameters:**

- `version` — Version string to evaluate.
- `config` — Loaded VersionGuard configuration.
- `previousVersion` — Optional previous version used for progression checks.

**Returns:** A feedback object with validation errors and suggested fixes.

```typescript
const feedbackResult = getVersionFeedback('1.2.3', config, '1.2.2');
console.log(feedbackResult.valid);
```

### `getSyncFeedback`

Generates suggestions for version sync mismatches in a file.

```typescript
(file: string, foundVersion: string, expectedVersion: string) => Suggestion[]
```

**Parameters:**

- `file` — File containing the mismatched version string.
- `foundVersion` — Version currently found in the file.
- `expectedVersion` — Version that should appear in the file.

**Returns:** Suggestions for resolving the mismatch.

```typescript
const suggestions = getSyncFeedback('README.md', '1.0.0', '1.0.1');
console.log(suggestions[0]?.message);
```

### `getChangelogFeedback`

Generates suggestions for changelog-related validation issues.

```typescript
(hasEntry: boolean, version: string, latestChangelogVersion?: string) => Suggestion[]
```

**Parameters:**

- `hasEntry` — Whether the changelog already contains an entry for the version.
- `version` — Package version that should appear in the changelog.
- `latestChangelogVersion` — Most recent version currently found in the changelog.

**Returns:** Suggestions for bringing changelog state back into sync.

```typescript
const suggestions = getChangelogFeedback(false, '1.2.3', '1.2.2');
console.log(suggestions.length > 0);
```

### `getTagFeedback`

Generates suggestions for git tag mismatches.

```typescript
(tagVersion: string, packageVersion: string, hasUnsyncedFiles: boolean) => Suggestion[]
```

**Parameters:**

- `tagVersion` — Version represented by the git tag.
- `packageVersion` — Version currently stored in `package.json`.
- `hasUnsyncedFiles` — Whether repository files are still out of sync.

**Returns:** Suggestions for correcting tag-related issues.

```typescript
const suggestions = getTagFeedback('v1.2.2', '1.2.3', true);
console.log(suggestions.map((item) => item.message));
```

### `getNestedValue`

Traverses a nested object using a dotted key path.

```typescript
(obj: Record<string, unknown>, dotPath: string) => unknown
```

**Parameters:**

- `obj` — Object to traverse.
- `dotPath` — Dot-separated key path (e.g. `'package.version'`).

**Returns:** The value at the path, or `undefined` if any segment is missing.

```ts
import { getNestedValue } from './utils';

const obj = { package: { version: '1.0.0' } };
const version = getNestedValue(obj, 'package.version'); // '1.0.0'
```

### `setNestedValue`

Sets a value at a dotted key path, throwing if intermediate segments are missing.

```typescript
(obj: Record<string, unknown>, dotPath: string, value: unknown) => void
```

**Parameters:**

- `obj` — Object to mutate.
- `dotPath` — Dot-separated key path.
- `value` — Value to set at the final key.

```ts
import { setNestedValue } from './utils';

const obj = { package: { version: '1.0.0' } };
setNestedValue(obj, 'package.version', '2.0.0');
```

### `escapeRegExp`

Escapes special regex characters in a string for safe use in `new RegExp()`.

```typescript
(value: string) => string
```

**Parameters:**

- `value` — Raw string to escape.

**Returns:** The escaped string safe for embedding in a `RegExp` constructor.

```ts
import { escapeRegExp } from './utils';

const escaped = escapeRegExp('file.txt'); // 'file\\.txt'
```

### `resolveVersionSource`

Resolves the version source provider for a project.

```typescript
(config: ManifestConfig, cwd?: string) => VersionSourceProvider
```

**Parameters:**

- `config` — Manifest configuration from `.versionguard.yml`.
- `cwd` — Project directory to scan.

**Returns:** The resolved version source provider.

```ts
import { resolveVersionSource } from './resolve';

const provider = resolveVersionSource({ source: 'auto' }, process.cwd());
const version = provider.getVersion(process.cwd());
```

### `detectManifests`

Detects all manifest files present in a project directory.

```typescript
(cwd?: string) => ManifestSourceType[]
```

**Parameters:**

- `cwd` — Project directory to scan.

**Returns:** Array of detected manifest source types.

```ts
import { detectManifests } from './resolve';

const manifests = detectManifests(process.cwd());
// ['package.json', 'Cargo.toml']
```

### `getPackageJsonPath`

Gets the `package.json` path for a project directory.

```typescript
(cwd?: string) => string
```

**Parameters:**

- `cwd` — Project directory containing `package.json`.

**Returns:** The resolved `package.json` path.

```ts
import { getPackageJsonPath } from 'versionguard';

const packagePath = getPackageJsonPath(process.cwd());
```

### `readPackageJson`

Reads and parses a project's `package.json` file.

```typescript
(cwd?: string) => PackageJson
```

**Parameters:**

- `cwd` — Project directory containing `package.json`.

**Returns:** The parsed `package.json` document.

```ts
import { readPackageJson } from 'versionguard';

const pkg = readPackageJson(process.cwd());
```

### `writePackageJson`

Writes a `package.json` document back to disk.

```typescript
(pkg: PackageJson, cwd?: string) => void
```

**Parameters:**

- `pkg` — Parsed `package.json` data to write.
- `cwd` — Project directory containing `package.json`.

```ts
import { readPackageJson, writePackageJson } from 'versionguard';

const pkg = readPackageJson(process.cwd());
writePackageJson(pkg, process.cwd());
```

### `getPackageVersion`

Gets the version string from the project manifest.  When a `manifest` config is provided, uses the configured version source provider (auto-detection or explicit). Falls back to `package.json` for backwards compatibility when no config is provided.

```typescript
(cwd?: string, manifest?: ManifestConfig) => string
```

**Parameters:**

- `cwd` — Project directory containing the manifest.
- `manifest` — Optional manifest configuration for language-agnostic support.

**Returns:** The project version string.

```ts
import { getPackageVersion } from 'versionguard';

// Read from package.json (legacy fallback)
const version = getPackageVersion(process.cwd());

// Read from a configured manifest source
const versionAlt = getPackageVersion(process.cwd(), { source: 'Cargo.toml' });
```

### `setPackageVersion`

Sets the version field in the project manifest.  When a `manifest` config is provided, uses the configured version source provider. Falls back to `package.json` for backwards compatibility when no config is provided.

```typescript
(version: string, cwd?: string, manifest?: ManifestConfig) => void
```

**Parameters:**

- `version` — Version string to persist.
- `cwd` — Project directory containing the manifest.
- `manifest` — Optional manifest configuration for language-agnostic support.

```ts
import { setPackageVersion } from 'versionguard';

// Write to package.json (legacy fallback)
setPackageVersion('1.2.3', process.cwd());

// Write to a configured manifest source
setPackageVersion('1.2.3', process.cwd(), { source: 'Cargo.toml' });
```

### `getVersionSource`

Resolves the version source provider for a project.

```typescript
(manifest: ManifestConfig, cwd?: string) => VersionSourceProvider
```

**Parameters:**

- `manifest` — Manifest configuration.
- `cwd` — Project directory.

**Returns:** The resolved provider instance.

```ts
import { getVersionSource } from 'versionguard';

const source = getVersionSource({ source: 'package.json' }, process.cwd());
const version = source.getVersion(process.cwd());
```

### `syncVersion`

Synchronizes configured files to a single version string.

```typescript
(version: string, config: SyncConfig, cwd?: string) => SyncResult[]
```

**Parameters:**

- `version` — Version string to write into matching files.
- `config` — Sync configuration describing files and replacement patterns.
- `cwd` — Project directory used to resolve file globs.

**Returns:** A sync result for each resolved file.

```ts
import { getDefaultConfig, syncVersion } from 'versionguard';

const results = syncVersion('1.2.3', getDefaultConfig().sync, process.cwd());
```

### `syncFile`

Synchronizes a single file to a target version.

```typescript
(filePath: string, version: string, patterns: SyncPattern[]) => SyncResult
```

**Parameters:**

- `filePath` — Absolute or relative path to the file to update.
- `version` — Version string to write.
- `patterns` — Replacement patterns to apply.

**Returns:** A result describing whether the file changed and what changed.

```ts
import { getDefaultConfig, syncFile } from 'versionguard';

const result = syncFile('README.md', '1.2.3', getDefaultConfig().sync.patterns);
```

### `checkHardcodedVersions`

Checks configured files for hardcoded version mismatches.

```typescript
(expectedVersion: string, config: SyncConfig, ignorePatterns: string[], cwd?: string) => VersionMismatch[]
```

**Parameters:**

- `expectedVersion` — Version all matching entries should use.
- `config` — Sync configuration describing files and replacement patterns.
- `ignorePatterns` — Glob patterns to exclude while scanning.
- `cwd` — Project directory used to resolve file globs.

**Returns:** A list of detected version mismatches.

```ts
import { checkHardcodedVersions, getDefaultConfig } from 'versionguard';

const mismatches = checkHardcodedVersions(
  '1.2.3',
  getDefaultConfig().sync,
  getDefaultConfig().ignore,
  process.cwd(),
);
```

### `scanRepoForVersions`

Scans the entire repository for hardcoded version literals.

```typescript
(expectedVersion: string, scanConfig: ScanConfig, ignorePatterns: string[], cwd?: string) => VersionMismatch[]
```

**Parameters:**

- `expectedVersion` — Version all matching entries should use.
- `scanConfig` — Scan configuration with patterns and allowlist.
- `ignorePatterns` — Glob patterns to exclude while scanning.
- `cwd` — Project directory used to resolve file globs.

**Returns:** A list of detected version mismatches across the repository.

```ts
import { getDefaultConfig, scanRepoForVersions } from 'versionguard';

const config = getDefaultConfig();
const findings = scanRepoForVersions('1.2.3', config.scan, config.ignore, process.cwd());
```

### `fixPackageVersion`

Updates the `package.json` version field when needed.

```typescript
(targetVersion: string, cwd?: string, manifest?: ManifestConfig) => FixResult
```

**Parameters:**

- `targetVersion` — Version that should be written to `package.json`.
- `cwd` — Repository directory containing `package.json`.
- `manifest` — Optional manifest configuration for language-agnostic support.

**Returns:** The result of the package version fix attempt.

```typescript
// Fix using legacy package.json fallback
const result = fixPackageVersion('1.2.3', process.cwd());
console.log(result.fixed);

// Fix using a configured manifest source
const result2 = fixPackageVersion('1.2.3', process.cwd(), { source: 'Cargo.toml' });
```

### `fixSyncIssues`

Synchronizes configured files to the package version.

```typescript
(config: VersionGuardConfig, cwd?: string) => FixResult[]
```

**Parameters:**

- `config` — Loaded VersionGuard configuration.
- `cwd` — Repository directory to synchronize.

**Returns:** A list of per-file sync results.

```typescript
const results = fixSyncIssues(config, process.cwd());
console.log(results.length);
```

### `fixChangelog`

Ensures the changelog contains an entry for a version.

```typescript
(version: string, config: VersionGuardConfig, cwd?: string) => FixResult
```

**Parameters:**

- `version` — Version that should appear in the changelog.
- `config` — Loaded VersionGuard configuration.
- `cwd` — Repository directory containing the changelog file.

**Returns:** The result of the changelog fix attempt.

```typescript
const result = fixChangelog('1.2.3', config, process.cwd());
console.log(result.message);
```

### `fixAll`

Runs all configured auto-fix operations.

```typescript
(config: VersionGuardConfig, targetVersion?: string, cwd?: string) => FixResult[]
```

**Parameters:**

- `config` — Loaded VersionGuard configuration.
- `targetVersion` — Optional version to apply before running other fixes.
- `cwd` — Repository directory where fixes should run.

**Returns:** Ordered results describing every fix step that ran.

```typescript
const results = fixAll(config, '1.2.3', process.cwd());
console.log(results.some((result) => result.fixed));
```

### `suggestNextVersion`

Suggests candidate next versions for a release.

```typescript
(currentVersion: string, config: VersionGuardConfig, changeType?: "major" | "minor" | "patch" | "auto") => { version: string; reason: string; }[]
```

**Parameters:**

- `currentVersion` — Current package version.
- `config` — Loaded VersionGuard configuration.
- `changeType` — Preferred bump type, or `auto` to include common options.

**Returns:** Candidate versions paired with the reason for each suggestion.

```typescript
const suggestions = suggestNextVersion('1.2.3', config, 'minor');
console.log(suggestions[0]?.version);
```

### `generateDependabotConfig`

Generates Dependabot YAML configuration from detected manifests.

```typescript
(manifests: ManifestSourceType[]) => string
```

**Parameters:**

- `manifests` — Detected manifest source types from the project.

**Returns:** The Dependabot configuration as a YAML string.

```ts
import { generateDependabotConfig } from 'versionguard';

const config = generateDependabotConfig(['package.json', 'Cargo.toml']);
```

### `writeDependabotConfig`

Writes a Dependabot configuration file to `.github/dependabot.yml`.

```typescript
(cwd: string, content: string) => string
```

**Parameters:**

- `cwd` — Project directory.
- `content` — YAML content to write.

**Returns:** The absolute path to the created file.

```ts
import { writeDependabotConfig } from 'versionguard';

const filePath = writeDependabotConfig(process.cwd(), 'version: 2\nupdates: []\n');
```

### `dependabotConfigExists`

Checks whether `.github/dependabot.yml` exists in the project.

```typescript
(cwd: string) => boolean
```

**Parameters:**

- `cwd` — Project directory.

**Returns:** `true` when the file exists.

```ts
import { dependabotConfigExists } from 'versionguard';

if (!dependabotConfigExists(process.cwd())) {
  console.log('No Dependabot config found');
}
```

### `installHooks`

Installs VersionGuard-managed Git hooks in a repository.

```typescript
(config: GitConfig, cwd?: string) => void
```

**Parameters:**

- `config` — Git configuration that selects which hooks to install.
- `cwd` — Repository directory where hooks should be installed.

```ts
import { getDefaultConfig, installHooks } from 'versionguard';

installHooks(getDefaultConfig().git, process.cwd());
```

### `uninstallHooks`

Removes VersionGuard-managed Git hooks from a repository.

```typescript
(cwd?: string) => void
```

**Parameters:**

- `cwd` — Repository directory whose hooks should be cleaned up.

```ts
import { uninstallHooks } from 'versionguard';

uninstallHooks(process.cwd());
```

### `findGitDir`

Finds the nearest `.git` directory by walking up from a starting directory.

```typescript
(cwd: string) => string | null
```

**Parameters:**

- `cwd` — Directory to start searching from.

**Returns:** The resolved `.git` directory path, or `null` when none is found.

```ts
import { findGitDir } from 'versionguard';

const gitDir = findGitDir(process.cwd());
```

### `areHooksInstalled`

Checks whether all VersionGuard-managed hooks are installed.

```typescript
(cwd?: string) => boolean
```

**Parameters:**

- `cwd` — Repository directory to inspect.

**Returns:** `true` when every managed hook is installed.

```ts
import { areHooksInstalled } from 'versionguard';

const installed = areHooksInstalled(process.cwd());
```

### `generateHookScript`

Generates the shell script content for a Git hook.

```typescript
(hookName: (typeof HOOK_NAMES)[number]) => string
```

**Parameters:**

- `hookName` — Name of the Git hook to generate.

**Returns:** Executable shell script contents for the hook.

```ts
import { generateHookScript } from 'versionguard';

const script = generateHookScript('pre-commit');
```

### `checkHooksPathOverride`

Checks whether git hooks have been redirected away from the repository.

```typescript
(cwd: string) => GuardWarning | null
```

**Parameters:**

- `cwd` — Repository directory to inspect.

**Returns:** A guard warning when a hooksPath override is detected.

```ts
import { checkHooksPathOverride } from './guard';

const warning = checkHooksPathOverride(process.cwd());
if (warning) console.warn(warning.message);
```

### `checkHuskyBypass`

Checks whether the HUSKY environment variable is disabling hooks.

```typescript
() => GuardWarning | null
```

**Returns:** A guard warning when the HUSKY bypass is detected.

```ts
import { checkHuskyBypass } from './guard';

const warning = checkHuskyBypass();
if (warning) console.warn(warning.message);
```

### `checkHookIntegrity`

Verifies that installed hook scripts match the expected content.

```typescript
(config: VersionGuardConfig, cwd: string) => GuardWarning[]
```

**Parameters:**

- `config` — VersionGuard configuration that defines which hooks should exist.
- `cwd` — Repository directory to inspect.

**Returns:** Guard warnings for each hook that has been tampered with.

```ts
import { checkHookIntegrity } from './guard';

const warnings = checkHookIntegrity(config, process.cwd());
for (const w of warnings) console.warn(w.code, w.message);
```

### `checkEnforceHooksPolicy`

Checks whether hooks are configured as required but not enforced.

```typescript
(config: VersionGuardConfig) => GuardWarning | null
```

**Parameters:**

- `config` — VersionGuard configuration to inspect.

**Returns:** A guard warning when hooks are enabled but not enforced.

```ts
import { checkEnforceHooksPolicy } from './guard';

const warning = checkEnforceHooksPolicy(config);
if (warning) console.warn(warning.message);
```

### `runGuardChecks`

Runs all guard checks and returns a consolidated report.

```typescript
(config: VersionGuardConfig, cwd: string) => GuardReport
```

**Parameters:**

- `config` — VersionGuard configuration.
- `cwd` — Repository directory to inspect.

**Returns:** A guard report with all findings.

```ts
import { runGuardChecks } from './guard';

const report = runGuardChecks(config, process.cwd());
if (!report.safe) console.error('Guard check failed:', report.warnings);
```

### `checkPublishStatus`

Checks whether a package version has been published to its ecosystem registry.

```typescript
(manifestSource: ManifestSourceType, packageName: string, version: string, config: PublishConfig) => Promise<PublishCheckResult>
```

**Parameters:**

- `manifestSource` — The detected manifest source type.
- `packageName` — Package name as read from the manifest.
- `version` — Version string to check.
- `config` — Publish configuration with timeout and optional registry URL.

**Returns:** The publish check result.

```ts
import { checkPublishStatus } from './publish';

const result = await checkPublishStatus('package.json', '@codluv/vg', '1.0.0', { enabled: true, timeout: 5000 });
```

### `readPackageName`

Reads the package name from a manifest file for registry lookups.

```typescript
(manifestSource: ManifestSourceType, cwd: string) => string | null
```

**Parameters:**

- `manifestSource` — Detected manifest type.
- `cwd` — Project directory.

**Returns:** The package name, or null if it cannot be determined.

```ts
import { readPackageName } from 'versionguard';

const name = readPackageName('package.json', process.cwd());
```

### `getDefaultConfig`

Returns a deep-cloned copy of the built-in VersionGuard configuration.

```typescript
() => VersionGuardConfig
```

**Returns:** The default VersionGuard configuration.

```ts
import { getDefaultConfig } from 'versionguard';

const config = getDefaultConfig();
```

### `findConfig`

Finds the first supported VersionGuard config file in a directory.

```typescript
(cwd?: string) => string | null
```

**Parameters:**

- `cwd` — Directory to search.

**Returns:** The resolved config path, or `null` when no config file exists.

```ts
import { findConfig } from 'versionguard';

const configPath = findConfig(process.cwd());
```

### `loadConfig`

Loads a VersionGuard config file from disk.

```typescript
(configPath: string) => VersionGuardConfig
```

**Parameters:**

- `configPath` — Path to the YAML config file.

**Returns:** The merged VersionGuard configuration.

```ts
import { loadConfig } from 'versionguard';

const config = loadConfig('.versionguard.yml');
```

### `getConfig`

Resolves the active VersionGuard configuration for a project.

```typescript
(cwd?: string) => VersionGuardConfig
```

**Parameters:**

- `cwd` — Project directory to inspect.

**Returns:** The resolved VersionGuard configuration.

```ts
import { getConfig } from 'versionguard';

const config = getConfig(process.cwd());
```

### `initConfig`

Initializes a new VersionGuard config file in a project.

```typescript
(cwd?: string) => string
```

**Parameters:**

- `cwd` — Project directory where the config should be created.

**Returns:** The path to the created config file.

```ts
import { initConfig } from 'versionguard';

const configPath = initConfig(process.cwd());
```

### `findProjectRoot`

Walks up from `startDir` to find the nearest project root.

```typescript
(startDir: string) => ProjectRootResult
```

**Parameters:**

- `startDir` — Directory to start searching from.

**Returns:** Detection result with the project root path and what was found.

```ts
import { findProjectRoot } from 'versionguard';

const result = findProjectRoot(process.cwd());
if (!result.found) {
  console.log('Not in a project directory');
}
```

### `formatNotProjectError`

Formats a helpful error message when a command can't find a project.

```typescript
(cwd: string, command: string) => string
```

**Parameters:**

- `cwd` — The directory that was checked.
- `command` — The command that was attempted.

**Returns:** A formatted, helpful error message.

```ts
import { formatNotProjectError } from 'versionguard';

const msg = formatNotProjectError('/tmp/empty', 'validate');
console.error(msg);
```

### `getLatestTag`

Returns the most recent reachable git tag for a repository.

```typescript
(cwd?: string) => TagInfo | null
```

**Parameters:**

- `cwd` — Repository directory to inspect.

**Returns:** The latest tag details, or `null` when no tag can be resolved.

```typescript
const latestTag = getLatestTag(process.cwd());

if (latestTag) {
  console.log(latestTag.version);
}
```

### `getAllTags`

Lists all tags in a repository.

```typescript
(cwd?: string) => TagInfo[]
```

**Parameters:**

- `cwd` — Repository directory to inspect.

**Returns:** A list of discovered tags, or an empty array when tags cannot be read.

```typescript
const tags = getAllTags(process.cwd());
console.log(tags.map((tag) => tag.name));
```

### `createTag`

Creates a release tag and optionally fixes version state first.

```typescript
(version: string, message?: string, autoFix?: boolean, config?: VersionGuardConfig, cwd?: string) => { success: boolean; message: string; actions: string[]; }
```

**Parameters:**

- `version` — Version to embed in the new tag name.
- `message` — Custom annotated tag message.
- `autoFix` — Whether to auto-fix version mismatches before tagging.
- `config` — Loaded VersionGuard configuration used for validation and fixes.
- `cwd` — Repository directory where git commands should run.

**Returns:** The tagging outcome and any actions performed along the way.

```typescript
const result = createTag('1.2.3', 'Release 1.2.3', true, config, process.cwd());

if (!result.success) {
  console.error(result.message);
}
```

### `handlePostTag`

Runs post-tag validation and sync checks.

```typescript
(config: VersionGuardConfig, cwd?: string) => { success: boolean; message: string; actions: string[]; }
```

**Parameters:**

- `config` — Loaded VersionGuard configuration used during validation.
- `cwd` — Repository directory where validation should run.

**Returns:** The post-tag workflow result and any follow-up actions.

```typescript
const result = handlePostTag(config, process.cwd());
console.log(result.success);
```

### `validateTagForPush`

Validates that a local tag is safe to push to the default remote.

```typescript
(tagName: string, cwd?: string) => { valid: boolean; message: string; fix?: string; }
```

**Parameters:**

- `tagName` — Name of the tag to validate.
- `cwd` — Repository directory where git commands should run.

**Returns:** A validation result with an optional suggested fix command.

```typescript
const result = validateTagForPush('v1.2.3', process.cwd());
console.log(result.valid);
```

### `suggestTagMessage`

Suggests an annotated tag message from changelog content.

```typescript
(version: string, cwd?: string) => string
```

**Parameters:**

- `version` — Version that the tag will represent.
- `cwd` — Repository directory containing the changelog file.

**Returns:** A suggested annotated tag message.

```typescript
const message = suggestTagMessage('1.2.3', process.cwd());
console.log(message);
```

### `validateVersion`

Validates a version string against the active versioning strategy.

```typescript
(version: string, config: VersionGuardConfig) => ValidationResult
```

**Parameters:**

- `version` — Version string to validate.
- `config` — VersionGuard configuration that selects the validation rules.

**Returns:** The validation result for the provided version.

```ts
import { getDefaultConfig, validateVersion } from 'versionguard';

const result = validateVersion('1.2.3', getDefaultConfig());
```

### `validate`

Validates the current project state against the supplied configuration.

```typescript
(config: VersionGuardConfig, cwd?: string, mode?: ValidateMode) => Promise<FullValidationResult>
```

**Parameters:**

- `config` — VersionGuard configuration to apply.
- `cwd` — Project directory to inspect.
- `mode` — Validation mode: 'full' (default) or 'lightweight'.

**Returns:** A full validation report for the project rooted at `cwd`.

```ts
import { getDefaultConfig, validate } from 'versionguard';

const result = await validate(getDefaultConfig(), process.cwd());
```

### `doctor`

Runs an extended readiness check for a project.

```typescript
(config: VersionGuardConfig, cwd?: string) => Promise<DoctorReport>
```

**Parameters:**

- `config` — VersionGuard configuration to apply.
- `cwd` — Project directory to inspect.

**Returns:** A readiness report that includes validation and Git diagnostics.

```ts
import { doctor, getDefaultConfig } from 'versionguard';

const report = doctor(getDefaultConfig(), process.cwd());
```

### `sync`

Synchronizes configured files to the current package version.

```typescript
(config: VersionGuardConfig, cwd?: string) => void
```

**Parameters:**

- `config` — VersionGuard configuration containing sync rules.
- `cwd` — Project directory whose files should be synchronized.

```ts
import { getDefaultConfig, sync } from 'versionguard';

sync(getDefaultConfig(), process.cwd());
```

### `canBump`

Determines whether a project can move from one version to another.

```typescript
(currentVersion: string, newVersion: string, config: VersionGuardConfig) => { canBump: boolean; error?: string; }
```

**Parameters:**

- `currentVersion` — Version currently in use.
- `newVersion` — Proposed next version.
- `config` — VersionGuard configuration that defines version rules.

**Returns:** An object indicating whether the bump is allowed and why it failed.

```ts
import { canBump, getDefaultConfig } from 'versionguard';

const result = canBump('1.2.3', '1.3.0', getDefaultConfig());
```

### `runWizard`

Runs the interactive setup wizard.

```typescript
(cwd: string) => Promise<string | null>
```

**Parameters:**

- `cwd` — Project directory to initialize.

**Returns:** The path to the created config file, or `null` if cancelled.

```ts
const configPath = await runWizard(process.cwd());
```

### `runHeadless`

Initializes VersionGuard non-interactively using CLI flags.

```typescript
(options: InitOptions) => string
```

**Parameters:**

- `options` — Headless initialization options.

**Returns:** The path to the created config file.

```ts
const configPath = runHeadless({ cwd: process.cwd(), type: 'calver', format: 'YYYY.M.MICRO' });
```

### `createProgram`

Creates the VersionGuard CLI program definition.

```typescript
() => Command
```

**Returns:** A configured Commander program for the VersionGuard CLI.

```typescript
const program = createProgram();
console.log(program.name());
```

### `runCli`

Parses CLI arguments and executes the matching command.

```typescript
(argv?: string[]) => Promise<void>
```

**Parameters:**

- `argv` — Full argument vector to parse.

```typescript
const argv = ['node', 'versionguard', 'check'];
await runCli(argv);
```

### `shouldRunCli`

Determines whether the current module is the invoked CLI entry point.

```typescript
(argv?: string[], metaUrl?: string) => boolean
```

**Parameters:**

- `argv` — Full process argument vector.
- `metaUrl` — Module URL to compare against the invoked entry path.

**Returns:** `true` when the current module should launch the CLI.

```typescript
const shouldRun = shouldRunCli(process.argv, import.meta.url);
console.log(shouldRun);
```

### `createTempProject`

Creates a temporary project directory with a minimal `package.json` fixture.

```typescript
() => string
```

**Returns:** The absolute path to the temporary project directory.

```ts
const cwd = createTempProject();
```

### `initGitRepo`

Initializes a git repository in a fixture directory with a first commit.

```typescript
(cwd: string) => void
```

**Parameters:**

- `cwd` — Absolute path to the fixture repository.

```ts
initGitRepo(cwd);
```

### `writeTextFile`

Writes a text fixture file relative to a temporary project directory.

```typescript
(cwd: string, relativePath: string, content: string) => string
```

**Parameters:**

- `cwd` — Absolute path to the fixture project.
- `relativePath` — Relative file path to create or overwrite.
- `content` — UTF-8 text content to write.

**Returns:** The absolute file path that was written.

```ts
writeTextFile(cwd, 'README.md', '# Fixture');
```

### `createBareRemote`

Creates a bare git repository to use as a remote in integration tests.

```typescript
() => string
```

**Returns:** The absolute path to the new bare repository.

```ts
const remote = createBareRemote();
```

### `addGitRemote`

Adds a local bare repository as the `origin` remote for a fixture repo.

```typescript
(cwd: string, remotePath: string) => void
```

**Parameters:**

- `cwd` — Absolute path to the fixture repository.
- `remotePath` — Absolute path to the bare remote repository.

```ts
addGitRemote(cwd, remotePath);
```

### `commitAll`

Stages all changes and creates a commit in a fixture repository.

```typescript
(cwd: string, message: string) => void
```

**Parameters:**

- `cwd` — Absolute path to the fixture repository.
- `message` — Commit message to use for the new commit.

```ts
commitAll(cwd, 'test: update fixture');
```

## Types

### `VersioningType`

Supported versioning strategies.

```typescript
VersioningType
```

### `ManifestSourceType`

Supported manifest source types for version extraction.

```typescript
ManifestSourceType
```

### `ManifestConfig`

Configures the version source manifest.

```typescript
ManifestConfig
```

**Members:**

- `source` — Manifest file to read the version from.  Use `'auto'` for file-existence detection or a specific filename.
- `path` — Dotted key path to the version field within the manifest.  For example `'version'` for package.json, `'package.version'` for Cargo.toml, or `'project.version'` for pyproject.toml.
- `regex` — Regex pattern to extract the version from source-code manifests.  Capture group 1 must contain the version string.

### `CalVerToken`

Valid CalVer token names for building format strings.

```typescript
CalVerToken
```

### `CalVerFormat`

A CalVer format string composed of dot-separated tokens.

```typescript
CalVerFormat
```

### `SchemeRules`

Configures scheme-level validation rules applied regardless of versioning type.

```typescript
SchemeRules
```

**Members:**

- `maxNumericSegments` — Maximum number of numeric segments before a warning is emitted.  Convention is 3 (e.g., `YYYY.MM.MICRO`). Formats with 4+ segments (e.g., `YYYY.0M.0D.MICRO`) are valid but trigger a warning.
- `allowedModifiers` — Allowed pre-release modifier tags.  When set, version modifiers (e.g., `-alpha`, `-rc1`) are validated against this whitelist. An empty array disallows all modifiers.

### `SemVerConfig`

Configures SemVer validation rules.

```typescript
SemVerConfig
```

**Members:**

- `allowVPrefix` — Tolerates a leading `v` prefix (e.g. `v1.2.3`).  When enabled the prefix is stripped before parsing.
- `allowBuildMetadata` — Permits `+build` metadata on version strings.
- `requirePrerelease` — Requires every version to carry a prerelease label.

### `CalVerConfig`

Configures CalVer validation rules.

```typescript
CalVerConfig
```

**Members:**

- `format` — Calendar format used when parsing and validating versions.
- `preventFutureDates` — Rejects versions that point to a future date.
- `strictMutualExclusion` — Enforces that week tokens (WW/0W) cannot be mixed with month/day tokens.

### `SyncPattern`

Describes a search-and-replace pattern used during version synchronization.

```typescript
SyncPattern
```

**Members:**

- `regex` — Regular expression string used to locate a version value.
- `template` — Replacement template applied when a match is updated.

### `SyncConfig`

Configures files and patterns that should stay in sync with the canonical version.

```typescript
SyncConfig
```

**Members:**

- `files` — File globs or paths that should be scanned for version updates.
- `patterns` — Replacement patterns applied to matching files.

### `ChangelogConfig`

Controls changelog validation behavior.

```typescript
ChangelogConfig
```

**Members:**

- `enabled` — Enables changelog validation.
- `file` — Path to the changelog file to inspect.
- `strict` — Treats changelog problems as hard failures.
- `requireEntry` — Requires an entry for the current version.
- `enforceStructure` — Validates that changelog section headers use only allowed names.  When enabled, any `### SectionName` header not present in `sections` is reported as an error.
- `sections` — Allowed Keep a Changelog section names.  Only applied when `enforceStructure` is `true`.

### `GitHooksConfig`

Toggles each supported git hook integration.

```typescript
GitHooksConfig
```

**Members:**

- `'pre-commit'` — Enables validation during the `pre-commit` hook.
- `'pre-push'` — Enables validation during the `pre-push` hook.
- `'post-tag'` — Enables follow-up tasks after a tag is created.

### `GitConfig`

Configures git-related enforcement.

```typescript
GitConfig
```

**Members:**

- `hooks` — Hook toggles used by the CLI and validation workflow.
- `enforceHooks` — Fails validation when required hooks are missing.

### `GitHubConfig`

Configures GitHub-specific integration features.

```typescript
GitHubConfig
```

**Members:**

- `dependabot` — Generates `.github/dependabot.yml` from detected manifests during init.

### `VersioningConfig`

Configures the active versioning mode.

```typescript
VersioningConfig
```

**Members:**

- `type` — Versioning strategy used for the project.
- `schemeRules` — Scheme-level validation rules applied regardless of versioning type.
- `semver` — SemVer-specific settings when `type` is `'semver'`.
- `calver` — CalVer-specific settings when `type` is `'calver'`.

### `ScanAllowlistEntry`

An intentional version reference that should be excluded from scan results.

```typescript
ScanAllowlistEntry
```

**Members:**

- `file` — Glob pattern matching the file(s) where this reference is intentional.
- `reason` — Reason this reference is allowed (for documentation / review).

### `ScanConfig`

Configures repo-wide scanning for hardcoded version literals.

```typescript
ScanConfig
```

**Members:**

- `enabled` — Enables repo-wide scanning for stale version literals.
- `patterns` — Regex patterns that match version-like strings in source files.  Capture group 1 must contain the version string.
- `allowlist` — Files containing intentional version references that should not be flagged.

### `GuardConfig`

Configures guard check behavior (hook bypass detection).

```typescript
GuardConfig
```

**Members:**

- `enabled` — Enables hook bypass detection in validate.

### `PublishConfig`

Configures registry publish status verification.

```typescript
PublishConfig
```

**Members:**

- `enabled` — Enables registry publish status check.
- `timeout` — Timeout in ms for registry HTTP/CLI calls.
- `registryUrl` — Override registry URL for private registries.

### `PublishCheckResult`

Result of a registry publish status check.

```typescript
PublishCheckResult
```

**Members:**

- `published` — Whether the version exists on the registry.
- `registry` — Registry name (npm, crates.io, pypi, etc.).
- `packageName` — Package name as read from the manifest.
- `error` — Set when the check could not complete (network, timeout).

### `GuardWarning`

Describes a single guard finding.

```typescript
GuardWarning
```

**Members:**

- `code` — Machine-readable code for filtering and automation.
- `severity` — Severity: errors block releases, warnings inform.
- `message` — Human-readable description of the issue.
- `fix` — Suggested remediation command when available.

### `GuardReport`

Result of a full guard check pass.

```typescript
GuardReport
```

**Members:**

- `safe` — True when no errors were found. Warnings alone do not fail.
- `warnings` — All findings from the guard check.

### `ValidateMode`

Controls whether validate runs all checks or a fast subset.

```typescript
ValidateMode
```

### `VersionGuardConfig`

Top-level configuration consumed by versionguard.

```typescript
VersionGuardConfig
```

**Members:**

- `versioning` — Active versioning settings.
- `manifest` — Version source manifest settings.
- `sync` — Synchronization settings for mirrored version strings.
- `changelog` — Changelog validation settings.
- `git` — Git enforcement settings.
- `github` — GitHub integration settings.
- `scan` — Repo-wide version literal scanning.
- `guard` — Guard check configuration (hook bypass detection).
- `publish` — Registry publish status verification.
- `ignore` — Files or patterns excluded from validation.

### `SemVer`

Parsed semantic version components.

```typescript
SemVer
```

**Members:**

- `major` — Major version number.
- `minor` — Minor version number.
- `patch` — Patch version number.
- `prerelease` — Ordered prerelease identifiers.
- `build` — Ordered build metadata identifiers.
- `raw` — Original version string.

### `CalVer`

Parsed calendar version components.

```typescript
CalVer
```

**Members:**

- `year` — Four-digit year value.
- `month` — Month or week value (1-12 for months, 1-53 for weeks).
- `day` — Day-of-month value when the selected format includes a day token.
- `patch` — Micro/patch counter when the selected format includes a counter token.
- `modifier` — Pre-release modifier string (e.g., `'alpha'`, `'rc1'`, `'dev'`).
- `format` — Source format used to interpret the raw string.
- `raw` — Original version string.

### `ParsedSemVer`

Parsed semantic version result wrapper.

```typescript
ParsedSemVer
```

**Members:**

- `type` — Discriminator for semantic version results.
- `version` — Parsed semantic version value.

### `ParsedCalVer`

Parsed calendar version result wrapper.

```typescript
ParsedCalVer
```

**Members:**

- `type` — Discriminator for calendar version results.
- `version` — Parsed calendar version value.

### `ParsedVersion`

Union of supported parsed version payloads.

```typescript
ParsedVersion
```

### `ValidationError`

Describes a single validation problem.

```typescript
ValidationError
```

**Members:**

- `file` — Source file associated with the error when available.
- `line` — One-based source line associated with the error when available.
- `message` — Human-readable validation message.
- `severity` — Severity of the reported problem.

### `ValidationResult`

Result returned by version parsing and validation helpers.

```typescript
ValidationResult
```

**Members:**

- `valid` — Indicates whether validation completed without errors.
- `errors` — Collected validation issues.
- `version` — Parsed version details when validation succeeds.

### `SyncChange`

Describes a single in-file version replacement.

```typescript
SyncChange
```

**Members:**

- `line` — One-based line number where the replacement occurred.
- `oldValue` — Previously matched value.
- `newValue` — Replacement value written to the file.

### `SyncResult`

Reports the result of synchronizing a single file.

```typescript
SyncResult
```

**Members:**

- `file` — File that was inspected or updated.
- `updated` — Indicates whether the file content changed.
- `changes` — Detailed replacements applied within the file.

### `VersionMismatch`

Reports a discovered version mismatch.

```typescript
VersionMismatch
```

**Members:**

- `file` — File containing the mismatched value.
- `line` — One-based line number of the mismatch.
- `found` — Version string found in the file.

### `FullValidationResult`

Combined result from a full project validation run.

```typescript
FullValidationResult
```

**Members:**

- `valid` — Indicates whether all checks passed.
- `version` — Canonical version string used for validation.
- `versionValid` — Indicates whether the root version string is valid.
- `syncValid` — Indicates whether synchronized files are in sync.
- `changelogValid` — Indicates whether changelog checks passed.
- `scanValid` — Indicates whether repo-wide scan passed (no stale version literals).
- `guardValid` — Indicates whether guard checks passed (no hook bypass detected).
- `publishValid` — Indicates whether the publish check passed.
- `publishCheck` — Detailed publish check result when publish checks are enabled.
- `guardReport` — Detailed guard check report when guard checks are enabled.
- `errors` — Human-readable validation failures collected during the run.

### `DoctorReport`

Reports whether a project is ready to pass VersionGuard checks.

```typescript
DoctorReport
```

**Members:**

- `ready` — Indicates whether all doctor checks passed.
- `version` — Package version resolved from the configured manifest source.
- `versionValid` — Indicates whether the package version matches the configured scheme.
- `syncValid` — Indicates whether synced files match the package version.
- `changelogValid` — Indicates whether changelog validation passed.
- `scanValid` — Indicates whether repo-wide scan passed.
- `guardValid` — Indicates whether guard checks passed.
- `publishValid` — Indicates whether the publish check passed.
- `gitRepository` — Indicates whether the current working directory is inside a Git repository.
- `hooksInstalled` — Indicates whether VersionGuard-managed Git hooks are installed.
- `worktreeClean` — Indicates whether `git status --porcelain` reports a clean worktree.
- `errors` — Human-readable validation and readiness errors.

### `ParsedCalVerFormat`

Parsed token layout for a supported CalVer format string.

```typescript
ParsedCalVerFormat
```

**Members:**

- `year` — Year token captured from the format string.
- `month` — Month token captured from the format string when present.
- `week` — Week token captured from the format string when present.
- `day` — Day token captured from the format string when present.
- `counter` — Counter token captured from the format string when present. Both `MICRO` and `PATCH` map to the same numeric counter.

### `ChangelogValidationResult`

Describes the outcome of validating a changelog file.

```typescript
ChangelogValidationResult
```

**Members:**

- `valid` — Indicates whether the changelog satisfies all requested checks.
- `errors` — Human-readable validation errors.
- `hasEntryForVersion` — Indicates whether the changelog contains an entry for the requested version.

### `ChangelogStructureOptions`

Options for changelog structure enforcement.

```typescript
ChangelogStructureOptions
```

**Members:**

- `enforceStructure` — Validate section headers against an allowed list.
- `sections` — Allowed section names. Defaults to Keep a Changelog standard sections.

### `Suggestion`

Feedback entry point exports for suggestion and guidance helpers.

```typescript
Suggestion
```

**Members:**

- `message` — Human-readable guidance for the user.
- `fix` — Command or action text that can be used to address the issue.
- `autoFixable` — Indicates whether VersionGuard can apply the suggestion automatically.

### `FeedbackResult`

Aggregates validation errors with suggested next steps.

```typescript
FeedbackResult
```

**Members:**

- `valid` — Indicates whether the inspected version state is valid.
- `errors` — Validation errors collected during the check.
- `suggestions` — Suggested next steps for resolving the reported issues.
- `canAutoFix` — Indicates whether at least one suggestion can be auto-applied.

### `VersionSourceProvider`

Abstraction for reading and writing a version string from any manifest format.

```typescript
VersionSourceProvider
```

**Members:**

- `name` — Human-readable provider name (e.g. `'package.json'`, `'Cargo.toml'`).
- `manifestFile` — Default manifest filename this provider handles.
- `exists` — Returns `true` when the manifest file exists in `cwd`.
- `getVersion` — Reads the version string from the manifest. Throws if missing or unreadable.
- `setVersion` — Writes a version string back to the manifest. Throws if the file does not exist.

### `PackageJsonValue`

JSON-compatible scalar, array, or object value used by package metadata.

```typescript
PackageJsonValue
```

### `PackageJsonArray`

Recursive array type used for arbitrary JSON-compatible package values.

```typescript
PackageJsonArray
```

### `PackageJsonObject`

Recursive object type used for arbitrary JSON-compatible package values.

```typescript
PackageJsonObject
```

### `PackageJson`

Minimal shape of a `package.json` document used by VersionGuard.

```typescript
PackageJson
```

**Members:**

- `name` — Package name.
- `version` — Package version string.

### `FixResult`

Fix entry point exports for auto-remediation helpers.

```typescript
FixResult
```

**Members:**

- `fixed` — Indicates whether the operation changed repository state.
- `message` — Human-readable description of the fix attempt.
- `file` — Absolute path to the file that was updated, when applicable.

### `ProjectRootResult`

Result of project root detection.

```typescript
ProjectRootResult
```

**Members:**

- `found` — Whether a project root was found.
- `root` — The resolved project root directory, or the original cwd if not found.
- `marker` — Which marker file was found.
- `hasConfig` — Whether the directory has a VersionGuard config.
- `hasGit` — Whether the directory is inside a git repository.
- `hasManifest` — Whether a version manifest file exists.

### `TagInfo`

Tag entry point exports for release-tag management helpers.

```typescript
TagInfo
```

**Members:**

- `name` — Full git tag name, including any prefix such as `v`.
- `version` — Normalized version string derived from the tag name.
- `message` — Annotated tag message when one is available.
- `date` — Timestamp associated with the tag lookup result.

### `InitOptions`

Options for headless (non-interactive) initialization.

```typescript
InitOptions
```

**Members:**

- `cwd` — Working directory path.
- `type` — Versioning type (semver or calver).
- `format` — CalVer format string.
- `allowVPrefix` — Allow v-prefix on SemVer versions.
- `allowBuildMetadata` — Allow build metadata on SemVer versions.
- `requirePrerelease` — Require prerelease labels on SemVer versions.
- `manifest` — Manifest source type.
- `github` — Whether to generate GitHub integration files (dependabot.yml).
- `hooks` — Whether to install git hooks.
- `changelog` — Whether to enable changelog validation.
- `yes` — Accept defaults without prompting.
- `force` — Overwrite existing config.

## Classes

### `GitTagSource`

Reads version from the latest Git tag. Writing creates a new annotated tag.

```typescript
typeof GitTagSource
```

**Members:**

- `name` — Human-readable provider name.
- `manifestFile` — Empty string since git-tag has no manifest file.
- `exists` — Returns `true` when `cwd` is inside a Git repository.
- `getVersion` — Reads the version string from the latest Git tag.
- `setVersion` — Creates a new annotated Git tag for the given version.
- `describeVersionTag` — Try version-like tag patterns, fall back to any tag.
- `detectPrefix` — Detect whether existing tags use a `v` prefix or not.

### `JsonVersionSource`

Reads and writes version strings from JSON manifest files.

```typescript
typeof JsonVersionSource
```

**Members:**

- `name` — Human-readable provider name.
- `manifestFile` — Filename of the JSON manifest (e.g. `'package.json'`).
- `versionPath` — Dotted key path to the version field within the JSON document.
- `exists` — Returns `true` when the manifest file exists in `cwd`.
- `getVersion` — Reads the version string from the JSON manifest.
- `setVersion` — Writes a version string to the JSON manifest, preserving indentation.

### `RegexVersionSource`

Reads and writes version strings using regex extraction from source files.

```typescript
typeof RegexVersionSource
```

**Members:**

- `name` — Human-readable provider name.
- `manifestFile` — Filename of the source manifest (e.g. `'setup.py'`).
- `versionRegex` — Compiled regex used to locate the version string.
- `exists` — Returns `true` when the manifest file exists in `cwd`.
- `getVersion` — Reads the version string from the source manifest using regex extraction.
- `setVersion` — Writes a version string to the source manifest using position-based replacement.

### `TomlVersionSource`

Reads and writes version strings from TOML manifest files.

```typescript
typeof TomlVersionSource
```

**Members:**

- `name` — Human-readable provider name.
- `manifestFile` — Filename of the TOML manifest (e.g. `'Cargo.toml'`).
- `versionPath` — Dotted key path to the version field within the TOML document.
- `exists` — Returns `true` when the manifest file exists in `cwd`.
- `getVersion` — Reads the version string from the TOML manifest.
- `setVersion` — Writes a version string to the TOML manifest, preserving formatting.
- `getSectionKey` — Splits the dotted version path into a TOML section name and key name.

### `VersionFileSource`

Reads and writes version strings from a plain text VERSION file.

```typescript
typeof VersionFileSource
```

**Members:**

- `name` — Human-readable provider name.
- `manifestFile` — Filename of the version file (e.g. `'VERSION'`).
- `exists` — Returns `true` when the version file exists in `cwd`.
- `getVersion` — Reads the version string from the plain text version file.
- `setVersion` — Writes a version string to the plain text version file.

### `YamlVersionSource`

Reads and writes version strings from YAML manifest files.

```typescript
typeof YamlVersionSource
```

**Members:**

- `name` — Human-readable provider name.
- `manifestFile` — Filename of the YAML manifest (e.g. `'pubspec.yaml'`).
- `versionKey` — Dotted key path to the version field within the YAML document.
- `exists` — Returns `true` when the manifest file exists in `cwd`.
- `getVersion` — Reads the version string from the YAML manifest.
- `setVersion` — Writes a version string to the YAML manifest, preserving formatting.

## Constants

### `MANIFEST_TO_ECOSYSTEM`

Maps VersionGuard manifest source types to Dependabot package-ecosystem values.

```typescript
Record<ManifestSourceType, string | null>
```

### `REGISTRY_TABLE`

Maps manifest source types to their registry check implementations.

```typescript
Record<string, { registry: string; check: (packageName: string, version: string, config: PublishConfig) => Promise<PublishCheckResult> | PublishCheckResult; }>
```
