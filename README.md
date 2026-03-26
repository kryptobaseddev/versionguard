# VersionGuard

Strict version governance for any project. SemVer and CalVer enforcement, language-agnostic manifest support, git hooks, changelog validation, file sync, and repo-wide version scanning.

```bash
npm install -D @codluv/versionguard@0.8.0
```

## Why it exists

Versioning breaks in the same places over and over:

- versions get hardcoded across docs, CI configs, and Dockerfiles
- changelog entries are forgotten or use wrong section names
- tags drift from the package version
- SemVer and CalVer rules get bent under pressure
- agents take shortcuts and leave the repo in an invalid release state

VersionGuard turns those into enforceable checks with repair-oriented feedback.

## Quick start

```bash
# Initialize config (interactive wizard or headless)
vg init

# Validate everything
vg validate

# Repair drift automatically
vg fix

# Scan entire repo for stale version literals
vg validate --scan
```

> `vg` is a shorthand alias for `versionguard`. Both work identically.

## What it does

- validates SemVer and CalVer formats with configurable rules
- keeps configured files synced from your manifest (package.json, Cargo.toml, pyproject.toml, etc.)
- scans the entire repo for stale version literals (`vg validate --scan`)
- validates Keep a Changelog structure with section enforcement
- installs cooperative git hooks (`pre-commit`, `pre-push`, `post-tag`)
- provides CLI commands for validation, sync, bumps, and tagging
- built-in CKM help system for humans and LLM agents

## Configuration

VersionGuard uses a single YAML config file. Both `semver:` and `calver:` blocks are always present — change `type` to switch.

```yaml
versioning:
  type: semver
  semver:
    allowVPrefix: false
    allowBuildMetadata: true
    requirePrerelease: false
  calver:
    format: "YYYY.MM.PATCH"
    preventFutureDates: true

sync:
  files:
    - "README.md"
    - "CHANGELOG.md"
  patterns:
    - regex: '(version\s*[=:]\s*["'])(.+?)(["'])'
      template: '$1{{version}}$3'

changelog:
  enabled: true
  file: "CHANGELOG.md"
  strict: true
  requireEntry: true
  enforceStructure: false
  sections:
    - Added
    - Changed
    - Deprecated
    - Removed
    - Fixed
    - Security

scan:
  enabled: false
  patterns:
    - '(?:version\s*[:=]\s*["''])(\d+\.\d+\.\d+(?:-[\w.]+)?)["'']'
    - '(?:FROM\s+\S+:)(\d+\.\d+\.\d+(?:-[\w.]+)?)'
    - '(?:uses:\s+\S+@v?)(\d+\.\d+\.\d+(?:-[\w.]+)?)'
  allowlist: []

git:
  hooks:
    pre-commit: true
    pre-push: true
    post-tag: true
  enforceHooks: true

ignore:
  - "node_modules/**"
  - "dist/**"
  - ".git/**"
  - "*.lock"
```

## Commands

| Command | Description |
| --- | --- |
| `vg init` | Create `.versionguard.yml` (interactive wizard or headless) |
| `vg check` | Validate the current version with actionable feedback |
| `vg validate` | Run version, sync, changelog, and optional scan validation |
| `vg validate --scan` | Include repo-wide stale version detection |
| `vg validate --strict` | Include guard checks for hook bypass detection |
| `vg doctor` | Report repository readiness in one pass |
| `vg fix` | Apply deterministic fixes for common drift |
| `vg fix-changelog` | Fix Changesets-mangled changelogs to Keep a Changelog format |
| `vg sync` | Update configured files to match manifest version |
| `vg bump` | Suggest the next version and optionally apply it |
| `vg tag [version]` | Create an annotated release tag safely |
| `vg hooks install` | Install managed git hooks |
| `vg hooks uninstall` | Remove managed git hooks |
| `vg ckm [topic]` | Codebase Knowledge Manifest — auto-generated help |
| `vg ckm [topic] --json` | Machine-readable CKM for LLM agents |

## Supported versioning modes

### SemVer

Configurable via the `semver:` block:

- `allowVPrefix` — tolerate `v1.2.3` format (stripped before parsing)
- `allowBuildMetadata` — permit `+build` metadata suffix
- `requirePrerelease` — require prerelease labels on every version
- `schemeRules.allowedModifiers` — whitelist prerelease tags (e.g., `alpha`, `beta`, `rc`)

### CalVer

Composable token-based format strings supporting all calver.org tokens:

- Year: `YYYY`, `YY`, `0Y`
- Month: `MM`, `M`, `0M`
- Week: `WW`, `0W`
- Day: `DD`, `D`, `0D`
- Counter: `MICRO`, `PATCH`

CalVer validation can reject future-dated versions and enforce modifier allowlists.

## Language-agnostic manifests

VersionGuard reads versions from any supported manifest:

- `package.json` (Node.js)
- `Cargo.toml` (Rust)
- `pyproject.toml` (Python)
- `pubspec.yaml` (Dart/Flutter)
- `composer.json` (PHP)
- `pom.xml` (Java/Maven)
- `VERSION` (plain text)
- Git tags (Go/Swift)
- Custom regex patterns

Set `manifest.source: auto` for automatic detection.

## Using with Changesets

VersionGuard and [Changesets](https://github.com/changesets/changesets) are complementary:

| Concern | Changesets | VersionGuard |
| --- | --- | --- |
| Decide the next version | Yes | No (validates, doesn't choose) |
| Update manifest version | Yes | No (reads it as source of truth) |
| Validate version format | No | Yes (SemVer/CalVer strictness) |
| Sync version across files | No | Yes (regex-based sync) |
| Validate changelog structure | No | Yes (Keep a Changelog + section enforcement) |
| Scan repo for stale versions | No | Yes |
| Git hooks enforcement | No | Yes |
| Publish to npm | Yes | No |

**Changesets decides what version comes next. VersionGuard validates that the result is correct.**

## Development

```bash
npm run lint
npm test
npm run build
npm run forge:check
npm run forge:build
```

## Docs

- Product vision: `docs/VISION.md`
- Verified feature ledger and roadmap: `docs/FEATURES.md`
- CKM module documentation: `src/ckm/README-CKM.md`

## License

MIT
