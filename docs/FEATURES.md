# VersionGuard Features

## Validation Policy

This document uses a strict rule:

- a feature is checked off only if it is present in the codebase and validated by current automated tests and/or repo verification commands
- anything planned but not yet verified stays unchecked

Current verification commands:

```bash
npm install
npm run lint
npm test
npm run build
npm run forge:check
npm run forge:doctor
```

## Verified Features

| Status | Feature | Description | Validation |
| --- | --- | --- | --- |
| [x] | SemVer | Strict SemVer parsing, validation, comparison, and increment helpers with leading-zero rejection and prerelease/build support | `src/__tests__/semver.test.ts` |
| [x] | CalVer | Multiple format support (`YYYY.MM.DD`, `YYYY.MM.PATCH`, `YY.M.PATCH`, `YYYY.0M.0D`), chronological comparison, patch increment, and future-date prevention | `src/__tests__/calver.test.ts` |
| [x] | Config File | YAML-based config loading, defaults, and project initialization via `.versionguard.yml` | `src/__tests__/cli.test.ts`, `src/__tests__/config.test.ts` |
| [x] | Auto-Sync | Regex/template-driven updates across configured files using `package.json` as the source of truth | `src/__tests__/sync.test.ts`, `src/__tests__/cli.test.ts` (`sync`) |
| [x] | Hardcoded Detection | Mismatch scanning across configured files with ignore patterns and protection for changelog `Unreleased` headers | `src/__tests__/sync.test.ts`, `src/__tests__/index.test.ts` |
| [x] | Changelog Validation | Keep a Changelog structure checks, required version entry checks, and entry insertion helper | `src/__tests__/changelog.test.ts` |
| [x] | Git Hooks | Pre-commit, pre-push, and post-tag hook installation/uninstallation with managed scripts | `src/__tests__/hooks.test.ts`, `src/__tests__/cli.test.ts` (`hooks install`) |
| [x] | Tag Automation | Annotated tag creation tied to package version and optional release automation | `src/__tests__/tag.test.ts`, `src/__tests__/cli.test.ts` (`tag`) |
| [x] | Release Guardrails | Tag flows refuse unsafe release actions when hooks are required, the worktree is dirty, or preflight validation fails | `src/__tests__/tag.test.ts` |
| [x] | Remote Tag/Push Validation | Local-vs-remote tag compatibility and push-readiness are validated with integration coverage | `src/__tests__/tag.test.ts` |
| [x] | CLI | `init`, `check`, `validate`, `doctor`, `sync`, `fix`, `bump`, `tag`, `hooks install`, `hooks uninstall`, and `hooks status` are implemented and exercised | `src/__tests__/cli.test.ts` |
| [x] | Doctor Command | One-pass repository readiness reporting for version, sync, changelog, hooks, and worktree state | `src/__tests__/cli.test.ts`, `src/__tests__/index.test.ts` |
| [x] | JSON Output | `doctor --json` and `validate --json` provide machine-readable output for CI and agent workflows | `src/__tests__/cli.test.ts` |
| [x] | Actionable Feedback | Version, sync, changelog, and tag feedback helpers produce repair-oriented guidance | `src/__tests__/feedback.test.ts` |
| [x] | Auto-Fix Helpers | Deterministic remediation helpers update package version, changelog entries, and synced files | `src/__tests__/fix.test.ts` |
| [x] | ESM Package Output | Full ESM package output with executable CLI bundle | `npm run build`, `npm install` |
| [x] | Vite Build | Production build uses Vite and generates distributable artifacts in `dist/` | `npm run build` |
| [x] | Vitest Test Suite | Project test runner is Vitest with coverage | `npm test` |
| [x] | Biome | Formatting and baseline lint checks are configured and passing | `npm run lint` |
| [x] | ESLint | Semantic TypeScript linting is configured and passing | `npm run lint` |
| [x] | Forge Setup | Forge is installed, initialized, locked, and wired into the repo with config, docs scaffolding, and hook support | `npm run forge:doctor` |
| [x] | Forge Compliance | Current exported API docs pass Forge checks with zero warnings and zero errors | `npm run forge:check` |

## Notes on Verified Scope

Some checked features are validated at different layers:

- CLI commands are validated partly through command tests and partly through the underlying tested core modules they delegate to
- tag and hook behavior are validated in temporary git repositories created during tests
- installability is treated as a product feature because `prepare` runs the build during `npm install`
- Forge compliance is validated separately from runtime behavior and confirms the public API surface is documented and structured correctly

## Roadmap: Planned but Not Yet Checked Off

VersionGuard is an enforcement layer. It validates and guards. It does not own version selection, changelog authoring, or publishing. Those belong to release automation tools like Changesets. See `docs/VISION.md` for the full integration philosophy.

The roadmap focuses on deepening enforcement, not broadening into release automation.

| Status | Priority | Feature | Why it matters |
| --- | --- | --- | --- |
| [ ] | 1 | Agent guardrails | Detect `--no-verify` bypasses, warn about skipped hooks, add `--strict` mode that fails on any policy gap. Core differentiator per the vision. |
| [ ] | 2 | Smarter hardcoded version scanning | Scan the entire repo for accidental version literals beyond configured sync files. Catches drift that pattern-based sync misses. |
| [ ] | 3 | Stronger CLI integration coverage | Add explicit automated tests for every CLI command branch, not just the primary paths. Increases consumer confidence. |
| [ ] | 4 | Safer release commit policy | Block tagging when HEAD is not a clean version-bump commit. Detect amended or rebased history. Tighten the release boundary. |
| [ ] | 5 | Remote tag/push workflow coverage | Validate remote tag compatibility and push-preflight behavior end to end. |

### Removed from roadmap

| Feature | Why removed |
| --- | --- |
| Dedicated changelog subcommands | Changelog authoring belongs to release automation (Changesets). VersionGuard validates changelog structure, it does not generate content. |
| Configurable sync capture semantics | Low impact. The current regex/template approach covers real-world patterns. Named capture groups can be revisited if users report limitations. |

## Claimed Feature Summary

The original assumed features are now in this state:

| Feature | State | Notes |
| --- | --- | --- |
| SemVer | verified | core parser/validator/comparator/increment path tested |
| CalVer | verified | multiple formats and future-date checks tested |
| Git Hooks | verified | install/uninstall and all three hook files validated |
| Auto-Sync | verified | sync updates configured files correctly |
| Hardcoded Detection | verified | mismatch scanning tested |
| Changelog | verified | validation and insertion helper tested |
| CLI | verified | core command surface implemented and exercised |
| Forge | verified | installed, initialized, locked, hooked, and passing |

## Exit Criteria for Future Checkboxes

Before a roadmap feature moves to checked:

1. implementation must exist in the main code path
2. at least one automated test or explicit verification command must prove it works
3. any related docs must be updated to match actual behavior

That rule keeps this file honest and prevents the roadmap from turning into marketing copy.
