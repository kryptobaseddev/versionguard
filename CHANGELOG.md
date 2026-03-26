# Changelog

## 0.4.0

### Minor Changes

- ec39479: feat: full calver.org specification with MICRO token, strict regex, MODIFIER support

  - `MICRO` accepted as CalVer-standard alias for `PATCH` (identical behavior)
  - CalVerFormat is now any valid dot-separated token combination (not a hardcoded enum)
  - New tokens: `0Y` (zero-padded short year), `WW`/`0W` (week of year)
  - Strict token regex patterns enforce value-level constraints at parse time (MM: 1-12, DD: 1-31)
  - MODIFIER support: parse and format pre-release suffixes (`-alpha.1`, `-rc2`, `-dev`)
  - `schemeRules.allowedModifiers`: whitelist valid modifier tags in config
  - `schemeRules.maxNumericSegments`: warn when format exceeds configured segment count
  - Format validation via `isValidCalVerFormat()` with structural rules

- ec39479: feat: interactive init wizard + headless CLI flags

  Interactive mode (`versionguard init`) walks users through versioning type, CalVer format selection, manifest source, git hooks, and changelog configuration using @clack/prompts.

  Headless mode for LLMs and CI:

  - `versionguard init --type calver --format YYYY.M.MICRO`
  - `versionguard init --manifest Cargo.toml --yes`
  - `versionguard init --no-hooks --no-changelog --yes`

  New flags: `--type`, `--format`, `--manifest`, `--hooks`/`--no-hooks`, `--changelog`/`--no-changelog`, `--yes`

### Patch Changes

- 8febca6: fix: address remaining audit findings for version source providers

  - **DRY refactor**: Extract shared `getNestedValue`, `setNestedValue`, `escapeRegExp` to `src/sources/utils.ts`; consolidate `getCalVerConfig` in types.ts (M-002, M-003, L-009)
  - **Feedback**: Replace all `npm version` fix suggestions with `npx versionguard fix --version` for language-agnostic support (M-001)
  - **Git-tag provider**: Auto-detect tag prefix convention (`v` vs bare); filter for version-like tags using `--match` (H-005, L-006)
  - **TOML write-back**: Handle dotted key syntax and inline table format (M-004, M-010)
  - **JSON provider**: Detect and preserve original indentation when writing (M-008)
  - **YAML provider**: Support nested dotted key paths (L-005)
  - **VERSION file**: Validate first-line only; reject binary files (L-003, L-004)
  - **Auto-detection**: Throw clear error with guidance when no manifest found instead of silent fallback (M-009)
  - **setNestedValue**: Throw on missing intermediate keys instead of silently creating them (L-001)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-03-25

### Added

- **Language-agnostic version source providers** — VersionGuard can now read and write version strings from any project type, not just package.json
- New providers: `JsonVersionSource` (package.json, composer.json), `TomlVersionSource` (Cargo.toml, pyproject.toml), `YamlVersionSource` (pubspec.yaml), `VersionFileSource` (VERSION files), `GitTagSource` (Go/Swift), `RegexVersionSource` (gemspec, mix.exs, build.gradle)
- Auto-detection scans for known manifests in priority order when `manifest.source` is `auto` (the default)
- New `manifest` config section in `.versionguard.yml` for explicit source configuration
- Path traversal protection for custom manifest paths
- Regex capture group validation for custom version patterns
- Config source type validation with clear error messages
- New dependency: `smol-toml` (zero-dep, ESM, TOML v1.1 parser)

## [0.2.0] - 2026-03-22

### Added

- **Agent guardrails** with `--strict` mode on `validate` and `doctor` commands
- New guard module detecting bypass patterns:
  - `HOOKS_PATH_OVERRIDE` — `core.hooksPath` redirecting away from `.git/hooks`
  - `HUSKY_BYPASS` — `HUSKY=0` environment variable disabling hooks
  - `HOOK_MISSING` — required hooks not installed
  - `HOOK_REPLACED` — hook files overwritten without versionguard invocation
  - `HOOK_TAMPERED` — hook files modified from expected template
  - `HOOKS_NOT_ENFORCED` — hooks enabled but `enforceHooks` is false
- Guard report included in `--json` output for CI and agent workflows
- Public API: `runGuardChecks()`, `checkHooksPathOverride()`, `checkHuskyBypass()`, `checkHookIntegrity()`, `checkEnforceHooksPolicy()`

## [0.1.1] - 2026-03-21

### Fixed

- Hook scripts now use `npx --no-install` to prevent accidentally downloading an unscoped package when `@codluv/versionguard` is not installed locally
- CLI version is now read from `package.json` at runtime instead of being hardcoded, so it stays in sync with changesets bumps
- Config test no longer uses hardcoded absolute paths, fixing CI failures on GitHub Actions

### Added

- `check --json` flag for machine-readable version check output (CI and agent workflows)
- "Using with Changesets" documentation section explaining how the two tools complement each other

## [0.1.0] - 2026-03-21

### Added

- Initial release of VersionGuard
- SemVer validation with strict parsing
- CalVer validation with future date prevention
- Git hooks integration (pre-commit, pre-push, post-tag)
- File synchronization for version references
- Hardcoded version detection
- Keep a Changelog validation
- CLI with init, check, validate, sync, bump commands
- Configurable via .versionguard.yml

[Unreleased]: https://github.com/kryptobaseddev/versionguard/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/kryptobaseddev/versionguard/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kryptobaseddev/versionguard/releases/tag/v0.1.0
