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
```

## Verified Features

| Status | Feature | Description | Validation |
| --- | --- | --- | --- |
| [x] | SemVer | Strict SemVer parsing, validation, comparison, and increment helpers with leading-zero rejection and prerelease/build support | `src/__tests__/semver.test.ts` |
| [x] | CalVer | Multiple format support (`YYYY.MM.DD`, `YYYY.MM.PATCH`, `YY.M.PATCH`, `YYYY.0M.0D`), chronological comparison, patch increment, and future-date prevention | `src/__tests__/calver.test.ts` |
| [x] | Config File | YAML-based config loading, defaults, and project initialization via `.versionguard.yml` | `src/__tests__/cli.test.ts` (`init`) |
| [x] | Auto-Sync | Regex/template-driven updates across configured files using `package.json` as the source of truth | `src/__tests__/sync.test.ts`, `src/__tests__/cli.test.ts` (`sync`) |
| [x] | Hardcoded Detection | Mismatch scanning across configured files with ignore patterns and protection for changelog `Unreleased` headers | `src/__tests__/sync.test.ts`, `src/__tests__/index.test.ts` |
| [x] | Changelog Validation | Keep a Changelog structure checks, required version entry checks, and entry insertion helper | `src/__tests__/changelog.test.ts` |
| [x] | Git Hooks | Pre-commit, pre-push, and post-tag hook installation/uninstallation with managed scripts | `src/__tests__/hooks.test.ts`, `src/__tests__/cli.test.ts` (`hooks install`) |
| [x] | Tag Automation | Annotated tag creation tied to package version and optional release automation | `src/__tests__/tag.test.ts`, `src/__tests__/cli.test.ts` (`tag`) |
| [x] | Release Guardrails | Tag flows refuse unsafe release actions when hooks are required, the worktree is dirty, or preflight validation fails | `src/__tests__/tag.test.ts` |
| [x] | CLI | `init`, `check`, `validate`, `sync`, `bump`, `tag`, `hooks install`, `hooks uninstall`, and `hooks status` commands are implemented; a tested subset exercises the core workflow | `src/__tests__/cli.test.ts` |
| [x] | Doctor Command | One-pass repository readiness reporting for version, sync, changelog, hooks, and worktree state | `src/__tests__/cli.test.ts`, `src/__tests__/index.test.ts` |
| [x] | Actionable Feedback | Version, sync, changelog, and tag feedback helpers produce repair-oriented guidance | covered indirectly by CLI/core tests and lint/build verification |
| [x] | ESM Package Output | Full ESM package output with executable CLI bundle | `npm run build`, `npm install` |
| [x] | Vite Build | Production build uses Vite and generates distributable artifacts in `dist/` | `npm run build` |
| [x] | Vitest Test Suite | Project test runner is Vitest with coverage | `npm test` |
| [x] | Biome | Formatting and baseline lint checks are configured and passing | `npm run lint` |
| [x] | ESLint | Semantic TypeScript linting is configured and passing | `npm run lint` |

## Notes on Verified Scope

Some checked features are validated at different layers:

- CLI commands are validated partly through command tests and partly through the underlying tested core modules they delegate to
- tag and hook behavior are validated in temporary git repositories created during tests
- installability is treated as a product feature because `prepare` runs the build during `npm install`

## Roadmap: Planned but Not Yet Checked Off

| Status | Feature | Why it matters |
| --- | --- | --- |
| [ ] | Dedicated changelog subcommands | The vision suggests richer built-in changelog workflows instead of only helper/fix behavior |
| [ ] | Smarter hardcoded version scanning | Expand beyond configured sync patterns into broader repo heuristics for accidental version literals |
| [ ] | Safer release commit policy | Tighten tag/release flows to better handle dirty trees, commit intent, and edge cases |
| [ ] | Stronger CLI integration coverage | Add explicit automated coverage for every CLI command branch, not just the primary paths |
| [ ] | Configurable sync capture semantics | Allow more precise control over which regex capture group represents the version value |
| [ ] | Remote tag/push workflow coverage | Validate remote tag compatibility and push-preflight behavior end to end |
| [ ] | More opinionated agent guardrails | Encode more of the "don't go off the rails" intent directly into release and validation workflows |

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

## Exit Criteria for Future Checkboxes

Before a roadmap feature moves to checked:

1. implementation must exist in the main code path
2. at least one automated test or explicit verification command must prove it works
3. any related docs must be updated to match actual behavior

That rule keeps this file honest and prevents the roadmap from turning into marketing copy.
