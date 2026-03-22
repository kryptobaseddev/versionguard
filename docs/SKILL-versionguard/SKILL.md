---
name: SKILL-versionguard
description: >
  Strict versioning enforcement for SemVer and CalVer with git hooks Use when: (1) running versionguard CLI commands, (2) calling its 67 API functions, (3) configuring versionguard, (4) understanding its 29 type definitions, (5) user mentions "semver", "calver", "versioning", "git-hooks", "changelog", (6) user mentions "versionguard" or asks about its API.
---

# versionguard

Strict versioning enforcement for SemVer and CalVer with git hooks

## Quick Start

```bash
npm install -D versionguard
```

```bash
npx versionguard --help
```

## API

| Function | Description |
|----------|-------------|
| `parseFormat()` | Breaks a CalVer format string into its component tokens. |
| `getRegexForFormat()` | Builds a regular expression that matches a supported CalVer format. |
| `parse()` | Parses a CalVer string using the supplied format. |
| `validate()` | Validates a CalVer string against formatting and date rules. |
| `format()` | Formats a parsed CalVer object back into a version string. |
| `getCurrentVersion()` | Creates the current CalVer string for a format. |
| `compare()` | Compares two CalVer strings using a shared format. |
| `increment()` | Increments a CalVer string. |
| `getNextVersions()` | Returns the most likely next CalVer candidates. |
| `validateChangelog()` | Validates a changelog file for release readiness.    0.1.0 |
| `getLatestVersion()` | Gets the most recent released version from a changelog.    0.1.0 |
| `addVersionEntry()` | Inserts a new version entry beneath the `[Unreleased]` section.    0.1.0 |
| `parse()` | Parses a semantic version string. |
| `validate()` | Validates that a string is a supported semantic version. |
| `compare()` | Compares two semantic version strings. |
| ... | 52 more — see API reference |

## Configuration

```typescript
import type { CalVerConfig } from "versionguard";

const config: Partial<CalVerConfig> = {
  // Calendar format used when parsing and validating versions.
  format: { /* ... */ },
  // Rejects versions that point to a future date.
  preventFutureDates: true,
};
```

See [references/CONFIGURATION.md](references/CONFIGURATION.md) for full details.

## Key Types

- **`VersioningType`** — Supported versioning strategies.    0.1.0
- **`CalVerFormat`** — Supported calendar version string layouts.    0.1.0
- **`CalVerConfig`** — Configures CalVer validation rules.    0.1.0
- **`SyncPattern`** — Describes a search-and-replace pattern used during version synchronization.    0.1.0
- **`SyncConfig`** — Configures files and patterns that should stay in sync with the canonical version.    0.1.0
- **`ChangelogConfig`** — Controls changelog validation behavior.    0.1.0
- **`GitHooksConfig`** — Toggles each supported git hook integration.    0.1.0
- **`GitConfig`** — Configures git-related enforcement.    0.1.0
- **`VersioningConfig`** — Configures the active versioning mode.    0.1.0
- **`VersionGuardConfig`** — Top-level configuration consumed by versionguard.    0.1.0

## References

- [references/CONFIGURATION.md](references/CONFIGURATION.md) — Full config options
- [references/API-REFERENCE.md](references/API-REFERENCE.md) — Signatures, parameters, examples
