# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2026-03-26

### Added

- Add repo-wide version literal scanning (T003)

  - New `scan` config block with `enabled`, `patterns`, and `allowlist` fields
  - `scanRepoForVersions()` globs the entire repo (respecting .gitignore and ignore patterns)
  - Default patterns detect version literals in code (`version = "1.2.3"`), Dockerfiles (`FROM node:18.0.0`), and GitHub Actions (`uses: action@v3.5.0`)
  - Allowlist entries exclude intentional references by file glob with optional reason
  - Binary files skipped by extension and null-byte detection
  - `vg validate --scan` flag enables scanning for a single run
  - `scan.enabled: true` in config enables permanent scanning
  - CKM auto-generates `scan` topic from ScanConfig
  - 12 new tests covering detection, allowlist, ignore, binary skip, and edge cases


## [0.7.0] - 2026-03-26

### Added

- Add changelog structure enforcement and `vg` CLI alias

  - Added `changelog.enforceStructure` config to validate section headers against an allowed list
  - Added `changelog.sections` config for custom section whitelists (defaults to Keep a Changelog: Added, Changed, Deprecated, Removed, Fixed, Security)
  - Empty changelog sections are detected and reported
  - Added `vg` as a CLI alias for `versionguard` — shorter to type, same functionality
  - CLI help text now shows `vg` as the primary command name
  - 7 new changelog structure enforcement tests (225 total)

## [0.6.0] - 2026-03-26

### Added

- Add SemVerConfig for symmetric versioning configuration

  - Added `SemVerConfig` interface with `allowVPrefix`, `allowBuildMetadata`, and `requirePrerelease` knobs
  - `schemeRules.allowedModifiers` now validates SemVer prerelease tags (was CalVer-only)
  - Config always ships both `semver:` and `calver:` blocks — `type` is the switch, no commenting/uncommenting needed
  - Extracted shared modifier validation into `scheme-rules.ts` (DRY across both versioning strategies)
  - Interactive wizard shows SemVer options when semver is selected
  - Headless init supports `--allow-v-prefix`, `--no-build-metadata`, `--require-prerelease` flags
  - CKM automatically generates a `semver` topic from the new `SemVerConfig` interface
  - 20 new tests covering all SemVer config knobs and schemeRules integration

## [0.5.0] - 2026-03-26

### Added

- CKM help system, project root detection, changelog auto-fixer, cooperative hooks

  **CKM (Codebase Knowledge Manifest):**

  - `versionguard ckm` — auto-derived topic index from forge-ts ckm.json
  - `versionguard ckm <topic>` — human-readable concept/operation/config docs
  - `versionguard ckm <topic> --json` — machine-readable CKM data for LLM agents
  - `versionguard ckm --llm` — full API context (forge-ts llms.txt)
  - Reusable `src/ckm/` module: `createCkmEngine(manifest)` works with any CLI framework
  - Topics auto-derived from `*Config` interfaces — zero manual mapping

  **Project root detection:**

  - All commands detect project root by walking up for `.versionguard.yml`, `.git`, or manifest files
  - Helpful error message with guidance when run outside a project directory

  **Changelog Changesets auto-fixer:**

  - `versionguard fix-changelog` — restructures Changesets-mangled changelog into Keep a Changelog format
  - Converts section names (Minor Changes → Added, Patch Changes → Fixed)
  - Strips commit hashes, adds dates and brackets, updates compare links
  - Also runs automatically during `versionguard fix`

  **Cooperative git hooks:**

  - `installHooks` appends VG block with `# >>> versionguard >>>` markers instead of overwriting
  - Husky, lefthook, pre-commit (Python), and other hook tools preserved
  - Re-running install replaces VG block in-place (idempotent)
  - `uninstallHooks` removes only VG block, preserves other tool content

  **Init idempotency:**

  - `init` requires `--force` to overwrite existing config
  - Global CLI install symlink resolution fixed

  **Dependencies:**

  - `@forge-ts/cli` updated to 0.21.1 (CKM generation support)

## [0.4.0] - 2026-03-25

### Added

- **Full calver.org specification** — `MICRO` token as CalVer-standard alias for `PATCH`, composable token-based format strings, new tokens `0Y` (zero-padded year), `WW`/`0W` (week)
- **Strict CalVer regex** — Token patterns now enforce value-level constraints at parse time (MM: 1-12, DD: 1-31, MICRO: no leading zeros)
- **MODIFIER support** — Parse and format pre-release suffixes (`-alpha.1`, `-rc2`, `-dev`) on any CalVer format
- **Scheme rules** — `schemeRules.allowedModifiers` whitelist and `schemeRules.maxNumericSegments` warning threshold in config
- **Interactive init wizard** — `versionguard init` walks users through versioning type, CalVer format, manifest source, hooks, and changelog via @clack/prompts
- **Headless init flags** — `--type`, `--format`, `--manifest`, `--hooks`/`--no-hooks`, `--changelog`/`--no-changelog`, `--yes` for LLM and CI usage
- **Format validation** — `isValidCalVerFormat()` exported for programmatic format string validation

### Fixed

- Extract shared `getNestedValue`, `setNestedValue`, `escapeRegExp` to `src/sources/utils.ts`
- Replace all `npm version` feedback suggestions with `npx versionguard fix --version` for language-agnostic support
- Git-tag provider auto-detects tag prefix convention and filters for version-like tags
- TOML write-back handles dotted key syntax and inline table format
- JSON provider detects and preserves original indentation when writing
- YAML provider supports nested dotted key paths
- VERSION file validates first-line only and rejects binary files
- Auto-detection throws clear error when no manifest found instead of silent fallback
- `setNestedValue` throws on missing intermediate keys instead of silently creating them

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

[Unreleased]: https://github.com/kryptobaseddev/versionguard/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/kryptobaseddev/versionguard/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kryptobaseddev/versionguard/releases/tag/v0.1.0
