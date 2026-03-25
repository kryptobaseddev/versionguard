# Changelog

## 0.3.0

### Minor Changes

- 913c5b0: feat: language-agnostic version source providers

  VersionGuard can now read and write version strings from any project type, not just package.json.

  **New providers:**

  - `JsonVersionSource` — package.json, composer.json
  - `TomlVersionSource` — Cargo.toml, pyproject.toml (via smol-toml)
  - `YamlVersionSource` — pubspec.yaml
  - `VersionFileSource` — plain text VERSION files
  - `GitTagSource` — Go, Swift (read-only from git tags)
  - `RegexVersionSource` — gemspec, mix.exs, build.gradle, setup.py

  **Configuration:**

  ```yaml
  # .versionguard.yml
  manifest:
    source: auto # or "Cargo.toml", "pyproject.toml", "git-tag", etc.
    path: package.version # dotted key path (provider-specific)
  ```

  **Auto-detection:** When `source: auto` (the default), VersionGuard scans for known manifest files in priority order: package.json → Cargo.toml → pyproject.toml → pubspec.yaml → composer.json → pom.xml → VERSION.

  **Security hardening:**

  - Path traversal protection for custom manifest paths
  - Regex capture group validation
  - Config source type validation
  - Position-based regex replacement to prevent file corruption

  **Backwards compatible:** Existing package.json workflows work without any config changes.

  **New dependency:** `smol-toml` (zero-dep, ESM, TOML v1.1 parser)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/kryptobaseddev/versionguard/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kryptobaseddev/versionguard/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/kryptobaseddev/versionguard/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kryptobaseddev/versionguard/releases/tag/v0.1.0
