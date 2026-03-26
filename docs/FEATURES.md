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
node dist/cli.js validate
```

## Verified Features

| Status | Feature | Description | Validation |
| --- | --- | --- | --- |
| [x] | SemVer | Strict SemVer parsing, validation, comparison, and increment helpers with leading-zero rejection and prerelease/build support. Configurable via `SemVerConfig` (allowVPrefix, allowBuildMetadata, requirePrerelease) | `src/__tests__/semver.test.ts` |
| [x] | CalVer (Full Spec) | Composable token-based format strings (YYYY, YY, 0Y, MM, M, 0M, WW, 0W, DD, D, 0D, MICRO, PATCH), strict regex validation (MM: 1-12, DD: 1-31), MODIFIER support (-alpha.1, -rc2), isValidCalVerFormat() | `src/__tests__/calver.test.ts` |
| [x] | Scheme Rules | schemeRules.allowedModifiers whitelist (validates both SemVer prerelease and CalVer modifiers), schemeRules.maxNumericSegments warning threshold, shared via scheme-rules.ts | `src/__tests__/calver.test.ts`, `src/__tests__/scheme-rules.test.ts` |
| [x] | Config File | YAML-based config loading, defaults, deep merge, and project initialization via `.versionguard.yml` | `src/__tests__/config.test.ts` |
| [x] | Language-Agnostic Manifests | Version source providers for package.json, Cargo.toml, pyproject.toml, pubspec.yaml, composer.json, pom.xml, VERSION files, git tags, and custom regex | `src/__tests__/sources.test.ts` |
| [x] | Manifest Auto-Detection | Scans for known manifest files in priority order when manifest.source is 'auto' | `src/__tests__/sources.test.ts` |
| [x] | Auto-Sync | Regex/template-driven version updates across configured files | `src/__tests__/sync.test.ts` |
| [x] | Hardcoded Detection | Mismatch scanning across configured files with ignore patterns | `src/__tests__/sync.test.ts`, `src/__tests__/index.test.ts` |
| [x] | Changelog Validation | Keep a Changelog structure checks, required version entry, date format enforcement | `src/__tests__/changelog.test.ts` |
| [x] | Changelog Auto-Fix | Detects and restructures Changesets-mangled changelogs into Keep a Changelog format | `src/__tests__/changelog.test.ts` |
| [x] | Cooperative Git Hooks | Appends VG block with markers to existing hooks (Husky, lefthook, etc.), idempotent re-install, clean uninstall | `src/__tests__/hooks.test.ts` |
| [x] | Agent Guardrails | `--strict` mode detects hook bypasses (HOOKS_PATH_OVERRIDE, HUSKY_BYPASS, HOOK_MISSING, HOOK_REPLACED, HOOK_TAMPERED, HOOKS_NOT_ENFORCED) | `src/__tests__/guard.test.ts` |
| [x] | Tag Automation | Annotated tag creation with version validation, auto-fix, and post-tag workflows | `src/__tests__/tag.test.ts` |
| [x] | Interactive Init Wizard | @clack/prompts guided setup: versioning type, CalVer format, manifest source, hooks, changelog | `src/__tests__/cli.test.ts` |
| [x] | Headless Init | `--type`, `--format`, `--manifest`, `--hooks/--no-hooks`, `--changelog/--no-changelog`, `--yes`, `--force`, `--allow-v-prefix`, `--no-build-metadata`, `--require-prerelease` flags | `src/__tests__/cli.test.ts` |
| [x] | Init Idempotency | Re-running init requires `--force` to overwrite; hooks replaced in-place without duplication | `src/__tests__/cli.test.ts` |
| [x] | Project Root Detection | Commands walk up from cwd to find .versionguard.yml, .git, or manifest files; helpful error when outside a project | CLI integration tests |
| [x] | CKM Help System | `versionguard ckm` with auto-derived topics from forge-ts ckm.json, --json for LLM agents, --llm for full API context | CLI integration tests |
| [x] | Path Traversal Protection | Custom manifest paths validated to stay within project directory | `src/__tests__/sources.test.ts` |
| [x] | JSON Output | `validate --json`, `doctor --json`, `check --json`, `ckm --json` for CI and agent workflows | `src/__tests__/cli.test.ts` |
| [x] | Actionable Feedback | Version, sync, changelog, and tag feedback with `npx versionguard fix` suggestions | `src/__tests__/feedback.test.ts` |
| [x] | ESM Package | Full ESM build with Vite, executable CLI bundle, forge-ts docs embedded | `npm run build` |
| [x] | Forge Compliance | forge-ts check passes with 0 errors, CKM manifest generated | `npm run forge:check` |
| [x] | Symmetric Config | Config ships both `semver:` and `calver:` blocks — `type` is the switch, no commenting needed | `src/__tests__/config.test.ts` |
| [x] | Changelog Structure Enforcement | `changelog.enforceStructure` validates section headers against `changelog.sections` whitelist (defaults to Keep a Changelog). Empty sections detected | `src/__tests__/changelog.test.ts` |
| [x] | `vg` CLI Alias | `vg` is a shorthand alias for `versionguard` — same binary, shorter to type | `package.json` bin field |
| [x] | 225 Tests | Full test suite with 94%+ coverage across 14 test files | `npm test` |

## Roadmap: Future Epics

VersionGuard is an enforcement layer. It validates and guards. It does not own version selection, changelog authoring, or publishing. See `docs/VISION.md` for the integration philosophy.

### T001: CKM Quickstart Layer

**Priority**: HIGH
**Problem**: CKM topics auto-derive from TypeScript interfaces (config schema) but don't include actionable CLI commands, workflows, or quick-start guides. A user asking "how do I set up a Rust project" gets type definitions, not a command to run.

**Deliverables**:
- [ ] Add `@workflow` tags to composite functions (init flows, release flows)
- [ ] CKM engine renders workflow steps as actionable CLI commands
- [ ] `versionguard ckm quickstart` topic with per-language setup instructions
- [ ] `versionguard ckm <topic>` output includes "Quick Start" section with example commands
- [ ] Enum values (ManifestSourceType, CalVerFormat tokens) surfaced in CKM config schema

**Depends on**: T002 (forge-ts enum/workflow enhancements)

### T002: forge-ts Enum & Workflow Enhancements

**Priority**: HIGH
**Problem**: forge-ts ckm.json reports `type: ManifestSourceType` but doesn't resolve the union to its concrete values. LLM agents can't determine valid options without reading source code. `@workflow` tags exist but aren't populated.

**Deliverables**:
- [ ] Research and build repro for forge-ts enum resolution request
  - Input: `type ManifestSourceType = 'auto' | 'package.json' | 'Cargo.toml' | ...`
  - Expected CKM output: `{ type: "enum", values: ["auto", "package.json", "Cargo.toml", ...] }`
  - Same for `CalVerToken` union type
- [ ] Research and build repro for `@workflow` tag population
  - Input: `@workflow` on `runWizard`, `fixAll`, `createTag`
  - Expected CKM output: `workflows[]` with step sequences
- [ ] File issues on kryptobaseddev/forge-ts with repro projects
- [ ] Integrate enhancements into VG once shipped

**Upstream repo**: kryptobaseddev/forge-ts

### T003: Smarter Hardcoded Version Scanning

**Priority**: MEDIUM
**Problem**: Current sync scanning only checks configured files. Accidental version literals in source code, CI configs, or Docker files go undetected.

**Deliverables**:
- [ ] Scan entire repo (respecting .gitignore) for version-like patterns
- [ ] Configurable allowlist for intentional version references
- [ ] Report with file:line locations and severity (warning vs error)
- [ ] Integration with `validate --strict`

### T004: Changelog Structure Enforcement ✓ (shipped v0.7.0)

**Priority**: MEDIUM
**Status**: SHIPPED

**Deliverables**:
- [x] `changelog.sections` config: whitelist of allowed section names
- [x] `changelog.enforceStructure` config: fail on non-standard sections
- [x] Detect and warn on empty sections
- [x] Integration with `validate` and `fix`

### T005: Release Commit Policy

**Priority**: LOW
**Problem**: Nothing prevents tagging a commit that isn't a clean version-bump. Amended or rebased history can create confusing release states.

**Deliverables**:
- [ ] Block tagging when HEAD is not a clean version-bump commit
- [ ] Detect amended or rebased commits in release range
- [ ] Configurable via `git.releasePolicy` in config

### T006: CKM Standalone Package

**Priority**: LOW
**Problem**: The `src/ckm/` module is reusable but lives inside VersionGuard. Other CLI tools can't consume it without copying files.

**Deliverables**:
- [ ] Extract `src/ckm/` into `@codluv/ckm-cli` standalone package
- [ ] Commander integration helper (drop-in command registration)
- [ ] Citty integration helper
- [ ] Documentation and examples for third-party adoption
- [ ] Publish to npm under `@codluv` scope

## Removed from Roadmap

| Feature | Why removed |
| --- | --- |
| Dedicated changelog subcommands | Changelog authoring belongs to release automation (Changesets). VersionGuard validates and auto-fixes structure, it does not generate content. |
| Configurable sync capture semantics | Low impact. The current regex/template approach covers real-world patterns. |
| Tree-sitter/LSP/AST integration | Research concluded these are overkill for manifest field extraction. Format-specific parsers + regex cover all use cases. See `docs/research/language-agnostic-version-extraction.md`. |

## Exit Criteria for Future Checkboxes

Before a roadmap feature moves to checked:

1. implementation must exist in the main code path
2. at least one automated test or explicit verification command must prove it works
3. any related docs must be updated to match actual behavior

That rule keeps this file honest and prevents the roadmap from turning into marketing copy.
