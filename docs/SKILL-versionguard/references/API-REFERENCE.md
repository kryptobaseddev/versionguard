# versionguard — API Reference

## Table of Contents

- [Functions](#functions)
- [Types](#types)

## Functions

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

parseFormat('YYYY.MM.PATCH');
// => { year: 'YYYY', month: 'MM', patch: 'PATCH' }
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

parse('2026.03.21', 'YYYY.0M.0D')?.month;
// => 3
```

### `validate`

Validates a CalVer string against formatting and date rules.

```typescript
(version: string, calverFormat: CalVerFormat, preventFutureDates?: boolean) => ValidationResult
```

**Parameters:**

- `version` — Version string to validate.
- `calverFormat` — Format expected for the version string.
- `preventFutureDates` — Whether future dates should be reported as errors.

**Returns:** A validation result containing any discovered errors and the parsed version on success.

```ts
import { validate } from 'versionguard';

validate('2026.03.21', 'YYYY.0M.0D', false).valid;
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

getCurrentVersion('YYYY.MM.PATCH', new Date('2026-03-21T00:00:00Z'));
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

compare('2026.03.2', '2026.03.1', 'YYYY.MM.PATCH');
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

increment('2026.03.1', 'YYYY.MM.PATCH');
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

getNextVersions('2026.03.1', 'YYYY.MM.PATCH').length;
// => 2
```

### `validateChangelog`

Validates a changelog file for release readiness.    0.1.0

```typescript
(changelogPath: string, version: string, strict?: boolean, requireEntry?: boolean) => ChangelogValidationResult
```

**Parameters:**

- `changelogPath` — Path to the changelog file.
- `version` — Version that must be present in the changelog.
- `strict` — Whether to require compare links and dated release headings.
- `requireEntry` — Whether the requested version must already have an entry.

**Returns:** The result of validating the changelog file.

```ts
import { validateChangelog } from 'versionguard';

const result = validateChangelog('CHANGELOG.md', '1.2.0', true, true);
```

### `getLatestVersion`

Gets the most recent released version from a changelog.    0.1.0

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

Inserts a new version entry beneath the `[Unreleased]` section.    0.1.0

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
(version: string) => ValidationResult
```

**Parameters:**

- `version` — Version string to validate.

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
(version: string, release: "major" | "minor" | "patch", prerelease?: string | undefined) => string
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

Generates actionable feedback for a version string.    0.1.0

```typescript
(version: string, config: VersionGuardConfig, previousVersion?: string | undefined) => FeedbackResult
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

Generates suggestions for version sync mismatches in a file.    0.1.0

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

Generates suggestions for changelog-related validation issues.    0.1.0

```typescript
(hasEntry: boolean, version: string, latestChangelogVersion?: string | undefined) => Suggestion[]
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

Generates suggestions for git tag mismatches.    0.1.0

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

### `getPackageJsonPath`

Gets the `package.json` path for a project directory.    0.1.0

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

Reads and parses a project's `package.json` file.    0.1.0

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

Writes a `package.json` document back to disk.    0.1.0

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

Gets the version string from `package.json`.    0.1.0

```typescript
(cwd?: string) => string
```

**Parameters:**

- `cwd` — Project directory containing `package.json`.

**Returns:** The package version string.

```ts
import { getPackageVersion } from 'versionguard';

const version = getPackageVersion(process.cwd());
```

### `setPackageVersion`

Sets the version field in `package.json`.    0.1.0

```typescript
(version: string, cwd?: string) => void
```

**Parameters:**

- `version` — Version string to persist.
- `cwd` — Project directory containing `package.json`.

```ts
import { setPackageVersion } from 'versionguard';

setPackageVersion('1.2.3', process.cwd());
```

### `syncVersion`

Synchronizes configured files to a single version string.    0.1.0

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

Synchronizes a single file to a target version.    0.1.0

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

Checks configured files for hardcoded version mismatches.    0.1.0

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

### `fixPackageVersion`

Updates the `package.json` version field when needed.    0.1.0

```typescript
(targetVersion: string, cwd?: string) => FixResult
```

**Parameters:**

- `targetVersion` — Version that should be written to `package.json`.
- `cwd` — Repository directory containing `package.json`.

**Returns:** The result of the package version fix attempt.

```typescript
const result = fixPackageVersion('1.2.3', process.cwd());
console.log(result.fixed);
```

### `fixSyncIssues`

Synchronizes configured files to the package version.    0.1.0

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

Ensures the changelog contains an entry for a version.    0.1.0

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

Runs all configured auto-fix operations.    0.1.0

```typescript
(config: VersionGuardConfig, targetVersion?: string | undefined, cwd?: string) => FixResult[]
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

Suggests candidate next versions for a release.    0.1.0

```typescript
(currentVersion: string, config: VersionGuardConfig, changeType?: "major" | "minor" | "patch" | "auto" | undefined) => { version: string; reason: string; }[]
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

### `installHooks`

Installs VersionGuard-managed Git hooks in a repository.    0.1.0

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

Removes VersionGuard-managed Git hooks from a repository.    0.1.0

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

Finds the nearest `.git` directory by walking up from a starting directory.    0.1.0

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

Checks whether all VersionGuard-managed hooks are installed.    0.1.0

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

Generates the shell script content for a Git hook.    0.1.0

```typescript
(hookName: "pre-commit" | "pre-push" | "post-tag") => string
```

**Parameters:**

- `hookName` — Name of the Git hook to generate.

**Returns:** Executable shell script contents for the hook.

```ts
import { generateHookScript } from 'versionguard';

const script = generateHookScript('pre-commit');
```

### `getDefaultConfig`

Returns a deep-cloned copy of the built-in VersionGuard configuration.    0.1.0

```typescript
() => VersionGuardConfig
```

**Returns:** The default VersionGuard configuration.

```ts
import { getDefaultConfig } from 'versionguard';

const config = getDefaultConfig();
```

### `findConfig`

Finds the first supported VersionGuard config file in a directory.    0.1.0

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

Loads a VersionGuard config file from disk.    0.1.0

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

Resolves the active VersionGuard configuration for a project.    0.1.0

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

Initializes a new VersionGuard config file in a project.    0.1.0

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

### `getLatestTag`

Returns the most recent reachable git tag for a repository.    0.1.0

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

Lists all tags in a repository.    0.1.0

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

Creates a release tag and optionally fixes version state first.    0.1.0

```typescript
(version: string, message?: string | undefined, autoFix?: boolean, config?: VersionGuardConfig | undefined, cwd?: string) => { success: boolean; message: string; actions: string[]; }
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

Runs post-tag validation and sync checks.    0.1.0

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

Validates that a local tag is safe to push to the default remote.    0.1.0

```typescript
(tagName: string, cwd?: string) => { valid: boolean; message: string; fix?: string | undefined; }
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

Suggests an annotated tag message from changelog content.    0.1.0

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

Validates a version string against the active versioning strategy.    0.1.0

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

Validates the current project state against the supplied configuration.    0.1.0

```typescript
(config: VersionGuardConfig, cwd?: string) => FullValidationResult
```

**Parameters:**

- `config` — VersionGuard configuration to apply.
- `cwd` — Project directory to inspect.

**Returns:** A full validation report for the project rooted at `cwd`.

```ts
import { getDefaultConfig, validate } from 'versionguard';

const result = validate(getDefaultConfig(), process.cwd());
```

### `doctor`

Runs an extended readiness check for a project.    0.1.0

```typescript
(config: VersionGuardConfig, cwd?: string) => DoctorReport
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

Synchronizes configured files to the current package version.    0.1.0

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

Determines whether a project can move from one version to another.    0.1.0

```typescript
(currentVersion: string, newVersion: string, config: VersionGuardConfig) => { canBump: boolean; error?: string | undefined; }
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

### `createProgram`

Creates the VersionGuard CLI program definition.    0.1.0

```typescript
() => Command
```

**Returns:** A configured Commander program for the VersionGuard CLI.

```typescript
const program = createProgram();
console.log(program.name());
```

### `runCli`

Parses CLI arguments and executes the matching command.    0.1.0

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

Determines whether the current module is the invoked CLI entry point.    0.1.0

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

Supported versioning strategies.    0.1.0

```typescript
any
```

### `CalVerFormat`

Supported calendar version string layouts.    0.1.0

```typescript
any
```

### `CalVerConfig`

Configures CalVer validation rules.    0.1.0

```typescript
any
```

**Members:**

- `format` — Calendar format used when parsing and validating versions.
- `preventFutureDates` — Rejects versions that point to a future date.

### `SyncPattern`

Describes a search-and-replace pattern used during version synchronization.    0.1.0

```typescript
any
```

**Members:**

- `regex` — Regular expression string used to locate a version value.
- `template` — Replacement template applied when a match is updated.

### `SyncConfig`

Configures files and patterns that should stay in sync with the canonical version.    0.1.0

```typescript
any
```

**Members:**

- `files` — File globs or paths that should be scanned for version updates.
- `patterns` — Replacement patterns applied to matching files.

### `ChangelogConfig`

Controls changelog validation behavior.    0.1.0

```typescript
any
```

**Members:**

- `enabled` — Enables changelog validation.
- `file` — Path to the changelog file to inspect.
- `strict` — Treats changelog problems as hard failures.
- `requireEntry` — Requires an entry for the current version.

### `GitHooksConfig`

Toggles each supported git hook integration.    0.1.0

```typescript
any
```

**Members:**

- `'pre-commit'` — Enables validation during the `pre-commit` hook.
- `'pre-push'` — Enables validation during the `pre-push` hook.
- `'post-tag'` — Enables follow-up tasks after a tag is created.

### `GitConfig`

Configures git-related enforcement.    0.1.0

```typescript
any
```

**Members:**

- `hooks` — Hook toggles used by the CLI and validation workflow.
- `enforceHooks` — Fails validation when required hooks are missing.

### `VersioningConfig`

Configures the active versioning mode.    0.1.0

```typescript
any
```

**Members:**

- `type` — Versioning strategy used for the project.
- `calver` — CalVer-specific settings when `type` is `'calver'`.

### `VersionGuardConfig`

Top-level configuration consumed by versionguard.    0.1.0

```typescript
any
```

**Members:**

- `versioning` — Active versioning settings.
- `sync` — Synchronization settings for mirrored version strings.
- `changelog` — Changelog validation settings.
- `git` — Git enforcement settings.
- `ignore` — Files or patterns excluded from validation.

### `SemVer`

Parsed semantic version components.    0.1.0

```typescript
any
```

**Members:**

- `major` — Major version number.
- `minor` — Minor version number.
- `patch` — Patch version number.
- `prerelease` — Ordered prerelease identifiers.
- `build` — Ordered build metadata identifiers.
- `raw` — Original version string.

### `CalVer`

Parsed calendar version components.    0.1.0

```typescript
any
```

**Members:**

- `year` — Four-digit year value.
- `month` — Month value from 1 through 12.
- `day` — Day-of-month value when the selected format includes a day token.
- `patch` — Patch counter when the selected format includes a patch token.
- `format` — Source format used to interpret the raw string.
- `raw` — Original version string.

### `ParsedSemVer`

Parsed semantic version result wrapper.    0.1.0

```typescript
any
```

**Members:**

- `type` — Discriminator for semantic version results.
- `version` — Parsed semantic version value.

### `ParsedCalVer`

Parsed calendar version result wrapper.    0.1.0

```typescript
any
```

**Members:**

- `type` — Discriminator for calendar version results.
- `version` — Parsed calendar version value.

### `ParsedVersion`

Union of supported parsed version payloads.    0.1.0

```typescript
any
```

### `ValidationError`

Describes a single validation problem.    0.1.0

```typescript
any
```

**Members:**

- `file` — Source file associated with the error when available.
- `line` — One-based source line associated with the error when available.
- `message` — Human-readable validation message.
- `severity` — Severity of the reported problem.

### `ValidationResult`

Result returned by version parsing and validation helpers.    0.1.0

```typescript
any
```

**Members:**

- `valid` — Indicates whether validation completed without errors.
- `errors` — Collected validation issues.
- `version` — Parsed version details when validation succeeds.

### `SyncChange`

Describes a single in-file version replacement.    0.1.0

```typescript
any
```

**Members:**

- `line` — One-based line number where the replacement occurred.
- `oldValue` — Previously matched value.
- `newValue` — Replacement value written to the file.

### `SyncResult`

Reports the result of synchronizing a single file.    0.1.0

```typescript
any
```

**Members:**

- `file` — File that was inspected or updated.
- `updated` — Indicates whether the file content changed.
- `changes` — Detailed replacements applied within the file.

### `VersionMismatch`

Reports a discovered version mismatch.    0.1.0

```typescript
any
```

**Members:**

- `file` — File containing the mismatched value.
- `line` — One-based line number of the mismatch.
- `found` — Version string found in the file.

### `FullValidationResult`

Combined result from a full project validation run.    0.1.0

```typescript
any
```

**Members:**

- `valid` — Indicates whether all checks passed.
- `version` — Canonical version string used for validation.
- `versionValid` — Indicates whether the root version string is valid.
- `syncValid` — Indicates whether synchronized files are in sync.
- `changelogValid` — Indicates whether changelog checks passed.
- `errors` — Human-readable validation failures collected during the run.

### `DoctorReport`

Reports whether a project is ready to pass VersionGuard checks.     0.1.0

```typescript
any
```

**Members:**

- `ready` — Indicates whether all doctor checks passed.
- `version` — Package version resolved from `package.json`.
- `versionValid` — Indicates whether the package version matches the configured scheme.
- `syncValid` — Indicates whether synced files match the package version.
- `changelogValid` — Indicates whether changelog validation passed.
- `gitRepository` — Indicates whether the current working directory is inside a Git repository.
- `hooksInstalled` — Indicates whether VersionGuard-managed Git hooks are installed.
- `worktreeClean` — Indicates whether `git status --porcelain` reports a clean worktree.
- `errors` — Human-readable validation and readiness errors.

### `ParsedCalVerFormat`

Parsed token layout for a supported CalVer format string.    0.1.0

```typescript
any
```

**Members:**

- `year` — Year token captured from the format string.
- `month` — Month token captured from the format string.
- `day` — Day token captured from the format string when present.
- `patch` — Patch token captured from the format string when present.

### `ChangelogValidationResult`

Describes the outcome of validating a changelog file.    0.1.0

```typescript
any
```

**Members:**

- `valid` — Indicates whether the changelog satisfies all requested checks.
- `errors` — Human-readable validation errors.
- `hasEntryForVersion` — Indicates whether the changelog contains an entry for the requested version.

### `Suggestion`

Feedback entry point exports for suggestion and guidance helpers.     0.1.0

```typescript
any
```

**Members:**

- `message` — Human-readable guidance for the user.
- `fix` — Command or action text that can be used to address the issue.
- `autoFixable` — Indicates whether VersionGuard can apply the suggestion automatically.

### `FeedbackResult`

Aggregates validation errors with suggested next steps.    0.1.0

```typescript
any
```

**Members:**

- `valid` — Indicates whether the inspected version state is valid.
- `errors` — Validation errors collected during the check.
- `suggestions` — Suggested next steps for resolving the reported issues.
- `canAutoFix` — Indicates whether at least one suggestion can be auto-applied.

### `PackageJson`

Minimal shape of a `package.json` document used by VersionGuard.    0.1.0

```typescript
any
```

**Members:**

- `name` — Package name.
- `version` — Package version string.

### `FixResult`

Fix entry point exports for auto-remediation helpers.     0.1.0

```typescript
any
```

**Members:**

- `fixed` — Indicates whether the operation changed repository state.
- `message` — Human-readable description of the fix attempt.
- `file` — Absolute path to the file that was updated, when applicable.

### `TagInfo`

Tag entry point exports for release-tag management helpers.     0.1.0

```typescript
any
```

**Members:**

- `name` — Full git tag name, including any prefix such as `v`.
- `version` — Normalized version string derived from the tag name.
- `message` — Annotated tag message when one is available.
- `date` — Timestamp associated with the tag lookup result.
