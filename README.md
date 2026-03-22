# VersionGuard

Strict version governance for TypeScript and Node.js projects.

VersionGuard keeps `package.json`, changelog entries, git tags, and configured version references in sync so humans and LLM agents stop shipping messy release state.

## Why it exists

Versioning breaks in the same places over and over:

- versions get hardcoded across docs and source files
- changelog entries are forgotten
- tags drift from the package version
- SemVer and CalVer rules get bent under pressure
- agents take shortcuts and leave the repo in an invalid release state

VersionGuard turns those into enforceable checks with repair-oriented feedback.

## What it does

- validates SemVer and CalVer formats strictly
- keeps configured files synced from `package.json`
- detects version mismatches in scanned files
- validates Keep a Changelog structure and required release entries
- installs git hooks for `pre-commit`, `pre-push`, and `post-tag`
- provides CLI commands for validation, sync, bumps, and tagging
- refuses unsafe tagging when hooks are required or the worktree is dirty

## Install

```bash
npm install -D @codluv/versionguard
npx versionguard init
npx versionguard hooks install
```

That gives you:

- a `.versionguard.yml` config file
- managed git hooks
- a repo-local version policy built around `package.json`

## Quick start

Run a basic version check:

```bash
npx versionguard check
```

Run full repository validation:

```bash
npx versionguard validate
```

For CI or agent workflows:

```bash
npx versionguard validate --json
```

Sync configured files back to the package version:

```bash
npx versionguard sync
```

Repair common issues automatically:

```bash
npx versionguard fix
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

VersionGuard uses a single YAML config file.

Example:

```yaml
versioning:
  type: semver

  # Enable this block when using calver
  # calver:
  #   format: "YYYY.MM.PATCH"
  #   preventFutureDates: true

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

VersionGuard supports strict semantic version validation with:

- `MAJOR.MINOR.PATCH`
- prerelease metadata such as `1.2.3-alpha.1`
- build metadata such as `1.2.3+build.5`
- precedence comparison and increment helpers

### CalVer

Supported formats currently include:

- `YYYY.MM.DD`
- `YYYY.MM.PATCH`
- `YY.M.PATCH`
- `YYYY.0M.0D`

CalVer validation can reject future-dated versions when enabled.

## Commands

| Command | Description |
| --- | --- |
| `versionguard init` | Create `.versionguard.yml` in the current project |
| `versionguard check` | Validate the current version with actionable feedback |
| `versionguard validate` | Run version, sync, and changelog validation |
| `versionguard doctor` | Report repository readiness in one pass |
| `versionguard fix` | Apply deterministic fixes for common drift |
| `versionguard sync` | Update configured files to match `package.json` |
| `versionguard bump` | Suggest the next version and optionally apply it |
| `versionguard tag [version]` | Create an annotated release tag safely |
| `versionguard hooks install` | Install managed git hooks |
| `versionguard hooks uninstall` | Remove managed git hooks |
| `versionguard hooks status` | Check whether hooks are installed |

## Git hook behavior

VersionGuard can install these hooks:

- `pre-commit`
- `pre-push`
- `post-tag`

When `git.enforceHooks` is enabled, release tagging also expects managed hooks to be present.

## Doctor command

Use `doctor` when you want a one-pass readiness report before releasing:

```bash
npx versionguard doctor
```

For CI or agent workflows:

```bash
npx versionguard doctor --json
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
npx versionguard validate --json
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
npx versionguard validate
```

### Repair drift after a manual version change

```bash
npm version patch
npx versionguard fix
```

### Suggest and apply the next version

```bash
npx versionguard bump --apply
```

### Create a release tag safely

```bash
npx versionguard tag 1.2.3 -m "Release 1.2.3"
```

## Using with Changesets

VersionGuard and [Changesets](https://github.com/changesets/changesets) are complementary tools that handle different parts of the release lifecycle.

| Concern | Changesets | VersionGuard |
| --- | --- | --- |
| Decide the next version | Yes | No (validates, doesn't choose) |
| Update `package.json` version | Yes | No (reads it as source of truth) |
| Validate version format | No | Yes (SemVer/CalVer strictness) |
| Sync version across files | No | Yes (regex-based sync) |
| Validate changelog structure | No | Yes (Keep a Changelog) |
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
npx versionguard validate

# 4. Publish
npx changeset publish
```

### CI integration

In GitHub Actions, both tools run in sequence. Changesets creates a "Version Packages" PR when changesets are pending. VersionGuard validates the result before publishing:

```yaml
- run: npm run build
- run: npx versionguard validate
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
