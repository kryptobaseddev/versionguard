# @codluv/versionguard — Configuration Reference

## `ManifestConfig`

Configures the version source manifest.

```typescript
import type { ManifestConfig } from "@codluv/versionguard";

const config: Partial<ManifestConfig> = {
  // Manifest file to read the version from.  Use `'auto'` for file-existence detection or a specific filename.
  source: { /* ... */ },
  // Dotted key path to the version field within the manifest.  For example `'version'` for package.json, `'package.version'` for Cargo.toml, or `'project.version'` for pyproject.toml.
  path: "...",
  // Regex pattern to extract the version from source-code manifests.  Capture group 1 must contain the version string.
  regex: "...",
};
```

| Property | Type | Description |
|----------|------|-------------|
| `source` | `ManifestSourceType` | Manifest file to read the version from.  Use `'auto'` for file-existence detection or a specific filename. |
| `path` | `string | undefined` | Dotted key path to the version field within the manifest.  For example `'version'` for package.json, `'package.version'` for Cargo.toml, or `'project.version'` for pyproject.toml. |
| `regex` | `string | undefined` | Regex pattern to extract the version from source-code manifests.  Capture group 1 must contain the version string. |

## `SemVerConfig`

Configures SemVer validation rules.

```typescript
import type { SemVerConfig } from "@codluv/versionguard";

const config: Partial<SemVerConfig> = {
  // Tolerates a leading `v` prefix (e.g. `v1.2.3`).  When enabled the prefix is stripped before parsing.
  allowVPrefix: true,
  // Permits `+build` metadata on version strings.
  allowBuildMetadata: true,
  // Requires every version to carry a prerelease label.
  requirePrerelease: true,
};
```

| Property | Type | Description |
|----------|------|-------------|
| `allowVPrefix` | `boolean` | Tolerates a leading `v` prefix (e.g. `v1.2.3`).  When enabled the prefix is stripped before parsing. |
| `allowBuildMetadata` | `boolean` | Permits `+build` metadata on version strings. |
| `requirePrerelease` | `boolean` | Requires every version to carry a prerelease label. |

## `CalVerConfig`

Configures CalVer validation rules.

```typescript
import type { CalVerConfig } from "@codluv/versionguard";

const config: Partial<CalVerConfig> = {
  // Calendar format used when parsing and validating versions.
  format: { /* ... */ },
  // Rejects versions that point to a future date.
  preventFutureDates: true,
  // Enforces that week tokens (WW/0W) cannot be mixed with month/day tokens.
  strictMutualExclusion: true,
};
```

| Property | Type | Description |
|----------|------|-------------|
| `format` | `CalVerFormat` | Calendar format used when parsing and validating versions. |
| `preventFutureDates` | `boolean` | Rejects versions that point to a future date. |
| `strictMutualExclusion` | `boolean | undefined` | Enforces that week tokens (WW/0W) cannot be mixed with month/day tokens. |

## `SyncConfig`

Configures files and patterns that should stay in sync with the canonical version.

```typescript
import type { SyncConfig } from "@codluv/versionguard";

const config: Partial<SyncConfig> = {
  // File globs or paths that should be scanned for version updates.
  files: "...",
  // Replacement patterns applied to matching files.
  patterns: [],
};
```

| Property | Type | Description |
|----------|------|-------------|
| `files` | `string[]` | File globs or paths that should be scanned for version updates. |
| `patterns` | `SyncPattern[]` | Replacement patterns applied to matching files. |

## `ChangelogConfig`

Controls changelog validation behavior.

```typescript
import type { ChangelogConfig } from "@codluv/versionguard";

const config: Partial<ChangelogConfig> = {
  // Enables changelog validation.
  enabled: true,
  // Path to the changelog file to inspect.
  file: "...",
  // Treats changelog problems as hard failures.
  strict: true,
  // Requires an entry for the current version.
  requireEntry: true,
  // Validates that changelog section headers use only allowed names.  When enabled, any `### SectionName` header not present in `sections` is reported as an error.
  enforceStructure: true,
  // Allowed Keep a Changelog section names.  Only applied when `enforceStructure` is `true`.
  sections: "...",
};
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Enables changelog validation. |
| `file` | `string` | Path to the changelog file to inspect. |
| `strict` | `boolean` | Treats changelog problems as hard failures. |
| `requireEntry` | `boolean` | Requires an entry for the current version. |
| `enforceStructure` | `boolean | undefined` | Validates that changelog section headers use only allowed names.  When enabled, any `### SectionName` header not present in `sections` is reported as an error. |
| `sections` | `string[] | undefined` | Allowed Keep a Changelog section names.  Only applied when `enforceStructure` is `true`. |

## `GitHooksConfig`

Toggles each supported git hook integration.

```typescript
import type { GitHooksConfig } from "@codluv/versionguard";

const config: Partial<GitHooksConfig> = {
  // Enables validation during the `pre-commit` hook.
  'pre-commit': true,
  // Enables validation during the `pre-push` hook.
  'pre-push': true,
  // Enables follow-up tasks after a tag is created.
  'post-tag': true,
};
```

| Property | Type | Description |
|----------|------|-------------|
| `'pre-commit'` | `boolean` | Enables validation during the `pre-commit` hook. |
| `'pre-push'` | `boolean` | Enables validation during the `pre-push` hook. |
| `'post-tag'` | `boolean` | Enables follow-up tasks after a tag is created. |

## `GitConfig`

Configures git-related enforcement.

```typescript
import type { GitConfig } from "@codluv/versionguard";

const config: Partial<GitConfig> = {
  // Hook toggles used by the CLI and validation workflow.
  hooks: { /* ... */ },
  // Fails validation when required hooks are missing.
  enforceHooks: true,
};
```

| Property | Type | Description |
|----------|------|-------------|
| `hooks` | `GitHooksConfig` | Hook toggles used by the CLI and validation workflow. |
| `enforceHooks` | `boolean` | Fails validation when required hooks are missing. |

## `GitHubConfig`

Configures GitHub-specific integration features.

```typescript
import type { GitHubConfig } from "@codluv/versionguard";

const config: Partial<GitHubConfig> = {
  // Generates `.github/dependabot.yml` from detected manifests during init.
  dependabot: true,
};
```

| Property | Type | Description |
|----------|------|-------------|
| `dependabot` | `boolean` | Generates `.github/dependabot.yml` from detected manifests during init. |

## `VersioningConfig`

Configures the active versioning mode.

```typescript
import type { VersioningConfig } from "@codluv/versionguard";

const config: Partial<VersioningConfig> = {
  // Versioning strategy used for the project.
  type: { /* ... */ },
  // Scheme-level validation rules applied regardless of versioning type.
  schemeRules: { /* ... */ },
  // SemVer-specific settings when `type` is `'semver'`.
  semver: { /* ... */ },
  // CalVer-specific settings when `type` is `'calver'`.
  calver: { /* ... */ },
};
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `VersioningType` | Versioning strategy used for the project. |
| `schemeRules` | `SchemeRules | undefined` | Scheme-level validation rules applied regardless of versioning type. |
| `semver` | `SemVerConfig | undefined` | SemVer-specific settings when `type` is `'semver'`. |
| `calver` | `CalVerConfig | undefined` | CalVer-specific settings when `type` is `'calver'`. |

## `ScanConfig`

Configures repo-wide scanning for hardcoded version literals.

```typescript
import type { ScanConfig } from "@codluv/versionguard";

const config: Partial<ScanConfig> = {
  // Enables repo-wide scanning for stale version literals.
  enabled: true,
  // Regex patterns that match version-like strings in source files.  Capture group 1 must contain the version string.
  patterns: "...",
  // Files containing intentional version references that should not be flagged.
  allowlist: [],
};
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Enables repo-wide scanning for stale version literals. |
| `patterns` | `string[]` | Regex patterns that match version-like strings in source files.  Capture group 1 must contain the version string. |
| `allowlist` | `ScanAllowlistEntry[]` | Files containing intentional version references that should not be flagged. |

## `VersionGuardConfig`

Top-level configuration consumed by versionguard.

```typescript
import type { VersionGuardConfig } from "@codluv/versionguard";

const config: Partial<VersionGuardConfig> = {
  // Active versioning settings.
  versioning: { /* ... */ },
  // Version source manifest settings.
  manifest: { /* ... */ },
  // Synchronization settings for mirrored version strings.
  sync: { /* ... */ },
  // Changelog validation settings.
  changelog: { /* ... */ },
  // Git enforcement settings.
  git: { /* ... */ },
  // GitHub integration settings.
  github: { /* ... */ },
  // Repo-wide version literal scanning.
  scan: { /* ... */ },
  // Files or patterns excluded from validation.
  ignore: "...",
};
```

| Property | Type | Description |
|----------|------|-------------|
| `versioning` | `VersioningConfig` | Active versioning settings. |
| `manifest` | `ManifestConfig` | Version source manifest settings. |
| `sync` | `SyncConfig` | Synchronization settings for mirrored version strings. |
| `changelog` | `ChangelogConfig` | Changelog validation settings. |
| `git` | `GitConfig` | Git enforcement settings. |
| `github` | `GitHubConfig` | GitHub integration settings. |
| `scan` | `ScanConfig` | Repo-wide version literal scanning. |
| `ignore` | `string[]` | Files or patterns excluded from validation. |

## `CkmConfigEntry`

A config schema entry with type, description, and default.

```typescript
import type { CkmConfigEntry } from "@codluv/versionguard";

const config: Partial<CkmConfigEntry> = {
  // Dotted key path (e.g., `'CalVerConfig.format'`).
  key: "...",
  // TypeScript type.
  type: "...",
  // Description from TSDoc.
  description: "...",
  // Default value if specified via `@defaultValue`.
  default: "...",
};
```

| Property | Type | Description |
|----------|------|-------------|
| `key` | `string` | Dotted key path (e.g., `'CalVerConfig.format'`). |
| `type` | `string` | TypeScript type. |
| `description` | `string` | Description from TSDoc. |
| `default` | `string | undefined` | Default value if specified via `@defaultValue`. |
