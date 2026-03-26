# VersionGuard

Strict version governance for any project — SemVer and CalVer enforcement, language-agnostic manifest support, git hooks, changelog validation, file sync, and repo-wide version scanning.

VersionGuard keeps your manifest, changelog entries, git tags, and configured version references in sync so humans and LLM agents stop shipping messy release state.

## Why it exists

Versioning breaks in the same places over and over:

- versions get hardcoded across docs, CI configs, and Dockerfiles
- changelog entries are forgotten or use wrong section names
- tags drift from the package version
- SemVer and CalVer rules get bent under pressure
- agents take shortcuts and leave the repo in an invalid release state

VersionGuard turns those into enforceable checks with repair-oriented feedback.

## What it does

- validates SemVer and CalVer formats with configurable rules
- keeps configured files synced from your manifest (package.json, Cargo.toml, pyproject.toml, etc.)
- scans the entire repo for stale version literals (`vg validate --scan`)
- validates Keep a Changelog structure with section enforcement
- installs cooperative git hooks for `pre-commit`, `pre-push`, and `post-tag`
- provides CLI commands for validation, sync, bumps, and tagging
- refuses unsafe tagging when hooks are required or the worktree is dirty
- built-in CKM help system for humans and LLM agents (`vg ckm`)

## Install

```bash
npm install -D @codluv/versionguard@latest
vg init
vg hooks install
```

> `vg` is a shorthand alias for `versionguard`. Both work identically.

That gives you:

- a `.versionguard.yml` config file
- managed git hooks
- a repo-local version policy built around your manifest

## Quick start

Run a basic version check:

```bash
vg check
```

Run full repository validation:

```bash
vg validate
```

Scan entire repo for stale version literals:

```bash
vg validate --scan
```

For CI or agent workflows:

```bash
vg validate --json
```

Sync configured files back to the manifest version:

```bash
vg sync
```

Repair common issues automatically:

```bash
vg fix
```

## Example output

Valid version:

```text
Current version: 1.2.3
Versioning type: semver

✓ Version is valid
```

Invalid version with actionable guidance:

```text
Current version: v1.0.0
Versioning type: semver

✗ Version has issues:

  ✗ Version should not start with 'v': v1.0.0

How to fix:
  → Remove the 'v' prefix
    Run: npm version 1.0.0
```

## Configuration

VersionGuard uses a single YAML config file. Both `semver:` and `calver:` blocks are always present — change `type` to switch.

Example:

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
    - regex: '(##\s*\[)(.+?)(\])'
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

## Supported versioning modes

### SemVer

VersionGuard supports strict semantic version validation with configurable rules via the `semver:` block:

- `MAJOR.MINOR.PATCH` with prerelease (`1.2.3-alpha.1`) and build metadata (`1.2.3+build.5`)
- `allowVPrefix` — tolerate `v1.2.3` format (stripped before parsing)
- `allowBuildMetadata` — permit or reject `+build` metadata suffix
- `requirePrerelease` — require prerelease labels on every version
- `schemeRules.allowedModifiers` — whitelist prerelease tags (e.g., `alpha`, `beta`, `rc`)
- precedence comparison and increment helpers

### CalVer

Composable token-based format strings supporting all calver.org tokens:

- Year: `YYYY`, `YY`, `0Y`
- Month: `MM`, `M`, `0M`
- Week: `WW`, `0W`
- Day: `DD`, `D`, `0D`
- Counter: `MICRO`, `PATCH`

CalVer validation can reject future-dated versions and enforce modifier allowlists.

### Language-agnostic manifests

VersionGuard reads versions from any supported manifest:

- `package.json` (Node.js), `Cargo.toml` (Rust), `pyproject.toml` (Python)
- `pubspec.yaml` (Dart/Flutter), `composer.json` (PHP), `pom.xml` (Java/Maven)
- `VERSION` (plain text), Git tags (Go/Swift), Custom regex patterns

Set `manifest.source: auto` for automatic detection.

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
| `vg hooks status` | Check whether hooks are installed |
| `vg ckm [topic]` | Codebase Knowledge Manifest — auto-generated help |
| `vg ckm [topic] --json` | Machine-readable CKM for LLM agents |

## Git hook behavior

VersionGuard can install these hooks:

- `pre-commit`
- `pre-push`
- `post-tag`

When `git.enforceHooks` is enabled, release tagging also expects managed hooks to be present.

## Doctor command

Use `doctor` when you want a one-pass readiness report before releasing:

```bash
vg doctor
```

For CI or agent workflows:

```bash
vg doctor --json
```

It reports:

- current package version
- version validity
- sync status
- changelog readiness
- hook installation state
- worktree cleanliness

## Validate JSON output

Use `validate --json` when you need machine-readable validation output:

```bash
vg validate --json
```

The JSON payload includes:

- `valid`
- `version`
- `versionValid`
- `syncValid`
- `changelogValid`
- `errors`
- `hook`
- `postTag`

## Tagging behavior

`versionguard tag` is intentionally strict.

It can refuse to proceed when:

- hooks are required but not installed
- the working tree is dirty
- the requested tag already exists
- the package version or changelog state is invalid
- synced files are out of date

That keeps release tags from becoming a bypass around normal validation.

## Typical workflows

### Validate before committing

```bash
vg validate
```

### Repair drift after a manual version change

```bash
npm version patch
vg fix
```

### Suggest and apply the next version

```bash
vg bump --apply
```

### Create a release tag safely

```bash
vg tag 1.2.3 -m "Release 1.2.3"
```

## Using with Changesets

VersionGuard and [Changesets](https://github.com/changesets/changesets) are complementary tools that handle different parts of the release lifecycle.

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

### Recommended workflow

```bash
# 1. Add a changeset when making changes
npx changeset

# 2. When ready to release, version the packages
npx changeset version

# 3. VersionGuard validates the new state
vg validate

# 4. Publish
npx changeset publish
```

### CI integration

In GitHub Actions, both tools run in sequence. Changesets creates a "Version Packages" PR when changesets are pending. VersionGuard validates the result before publishing:

```yaml
- run: npm run build
- run: vg validate
- uses: changesets/action@v1
  with:
    publish: npx changeset publish --access public
```

VersionGuard does not replace Changesets and does not conflict with it. Use Changesets for release automation. Use VersionGuard for release correctness.

## Development

This repository uses a modern ESM toolchain:

- Vite for builds
- Vitest for tests
- Biome for formatting and baseline linting
- ESLint for semantic TypeScript linting

Useful commands:

```bash
npm run lint
npm test
npm run build
```

Forge commands:

```bash
npm run forge:check
npm run forge:test
npm run forge:build
npm run forge:doctor
```

Initialize or refresh Forge scaffolding:

```bash
npm run forge:docs:init
```

Run a single test file:

```bash
npx vitest run src/__tests__/semver.test.ts
```

Run a single test by name:

```bash
npx vitest run src/__tests__/calver.test.ts -t "increments patch-based versions"
```

## Docs

- Product vision: `docs/VISION.md`
- Verified feature ledger and roadmap: `docs/FEATURES.md`
- CKM module documentation: `src/ckm/README-CKM.md`
- Agent guidance for contributors: `AGENTS.md`

## Forge

This repo is set up with `@forge-ts/cli` and a project config in `forge-ts.config.ts`.

Useful commands:

```bash
npm run forge:check
npm run forge:test
npm run forge:build
npm run forge:doctor
```

Current status:

- Forge is installed and initialized
- `forge-ts check` currently reports significant TSDoc debt
- generated documentation artifacts are written into `docs/`

Recommended workflow:

```bash
npm run forge:check
npm run forge:build
```

Then fix TSDoc issues in the order reported by Forge.

## License

MIT
