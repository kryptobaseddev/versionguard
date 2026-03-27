---
name: SKILL-versionguard
description: >
  Strict versioning enforcement for SemVer and CalVer — language-agnostic manifest support, git hooks, changelog validation, and file sync Use when: (1) running versionguard CLI commands, (2) calling its 95 API functions, (3) configuring @codluv/versionguard, (4) understanding its 60 type definitions, (5) working with its 6 classes, (6) user mentions "semver", "calver", "versioning", "git-hooks", "changelog", (7) user mentions "@codluv/versionguard" or asks about its API.
---

# @codluv/versionguard

Strict versioning enforcement for SemVer and CalVer — language-agnostic manifest support, git hooks, changelog validation, and file sync

## Quick Start

```bash
npm install -D @codluv/versionguard
```

```bash
npx versionguard --help
```

## API

| Function | Description |
|----------|-------------|
| `getSemVerConfig()` | Resolves the SemVer config from a VersionGuard config. |
| `getCalVerConfig()` | Extracts the CalVer config from a VersionGuard config, throwing if missing. |
| `validateModifier()` | Validates a pre-release / modifier tag against the allowed modifiers list. |
| `isValidCalVerFormat()` | Validates that a CalVer format string is composed of valid tokens and follows structural rules. |
| `parseFormat()` | Breaks a CalVer format string into its component tokens. |
| `getRegexForFormat()` | Builds a regular expression that matches a supported CalVer format. |
| `parse()` | Parses a CalVer string using the supplied format. |
| `validate()` | Validates a CalVer string against formatting and date rules. |
| `format()` | Formats a parsed CalVer object back into a version string. |
| `getCurrentVersion()` | Creates the current CalVer string for a format. |
| `compare()` | Compares two CalVer strings using a shared format. |
| `increment()` | Increments a CalVer string. |
| `getNextVersions()` | Returns the most likely next CalVer candidates. |
| `validateChangelog()` | Validates a changelog file for release readiness. |
| `getLatestVersion()` | Gets the most recent released version from a changelog. |
| ... | 80 more — see API reference |

## Configuration

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

See [references/CONFIGURATION.md](references/CONFIGURATION.md) for full details.

## Key Types

- **`VersioningType`** — Supported versioning strategies.
- **`ManifestSourceType`** — Supported manifest source types for version extraction.
- **`ManifestConfig`** — Configures the version source manifest.
- **`CalVerToken`** — Valid CalVer token names for building format strings.
- **`CalVerFormat`** — A CalVer format string composed of dot-separated tokens.
- **`SchemeRules`** — Configures scheme-level validation rules applied regardless of versioning type.
- **`SemVerConfig`** — Configures SemVer validation rules.
- **`CalVerConfig`** — Configures CalVer validation rules.
- **`SyncPattern`** — Describes a search-and-replace pattern used during version synchronization.
- **`SyncConfig`** — Configures files and patterns that should stay in sync with the canonical version.

## References

- [references/CONFIGURATION.md](references/CONFIGURATION.md) — Full config options
- [references/API-REFERENCE.md](references/API-REFERENCE.md) — Signatures, parameters, examples
