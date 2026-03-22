# versionguard — Configuration Reference

## `CalVerConfig`

Configures CalVer validation rules.    0.1.0

```typescript
import type { CalVerConfig } from "versionguard";

const config: Partial<CalVerConfig> = {
  // Calendar format used when parsing and validating versions.
  format: { /* ... */ },
  // Rejects versions that point to a future date.
  preventFutureDates: true,
};
```

| Property | Type | Description |
|----------|------|-------------|
| `format` | `CalVerFormat` | Calendar format used when parsing and validating versions. |
| `preventFutureDates` | `boolean` | Rejects versions that point to a future date. |

## `SyncConfig`

Configures files and patterns that should stay in sync with the canonical version.    0.1.0

```typescript
import type { SyncConfig } from "versionguard";

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

Controls changelog validation behavior.    0.1.0

```typescript
import type { ChangelogConfig } from "versionguard";

const config: Partial<ChangelogConfig> = {
  // Enables changelog validation.
  enabled: true,
  // Path to the changelog file to inspect.
  file: "...",
  // Treats changelog problems as hard failures.
  strict: true,
  // Requires an entry for the current version.
  requireEntry: true,
};
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Enables changelog validation. |
| `file` | `string` | Path to the changelog file to inspect. |
| `strict` | `boolean` | Treats changelog problems as hard failures. |
| `requireEntry` | `boolean` | Requires an entry for the current version. |

## `GitHooksConfig`

Toggles each supported git hook integration.    0.1.0

```typescript
import type { GitHooksConfig } from "versionguard";

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

Configures git-related enforcement.    0.1.0

```typescript
import type { GitConfig } from "versionguard";

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

## `VersioningConfig`

Configures the active versioning mode.    0.1.0

```typescript
import type { VersioningConfig } from "versionguard";

const config: Partial<VersioningConfig> = {
  // Versioning strategy used for the project.
  type: { /* ... */ },
  // CalVer-specific settings when `type` is `'calver'`.
  calver: { /* ... */ },
};
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `VersioningType` | Versioning strategy used for the project. |
| `calver` | `CalVerConfig | undefined` | CalVer-specific settings when `type` is `'calver'`. |

## `VersionGuardConfig`

Top-level configuration consumed by versionguard.    0.1.0

```typescript
import type { VersionGuardConfig } from "versionguard";

const config: Partial<VersionGuardConfig> = {
  // Active versioning settings.
  versioning: { /* ... */ },
  // Synchronization settings for mirrored version strings.
  sync: { /* ... */ },
  // Changelog validation settings.
  changelog: { /* ... */ },
  // Git enforcement settings.
  git: { /* ... */ },
  // Files or patterns excluded from validation.
  ignore: "...",
};
```

| Property | Type | Description |
|----------|------|-------------|
| `versioning` | `VersioningConfig` | Active versioning settings. |
| `sync` | `SyncConfig` | Synchronization settings for mirrored version strings. |
| `changelog` | `ChangelogConfig` | Changelog validation settings. |
| `git` | `GitConfig` | Git enforcement settings. |
| `ignore` | `string[]` | Files or patterns excluded from validation. |
