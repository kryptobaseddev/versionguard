# T008: Strict by Default — Unified Validation with Ecosystem Publish Checks

**Status**: APPROVED
**Version**: 1.0.0 (this spec ships as VG v1.0.0)
**Created**: 2026-03-26
**Decision Record**: 9-0 business panel vote on SemVer retention + 1.0.0 release

---

## 1. Problem Statement

VG validate runs a subset of available checks by default. Critical enforcement (guard checks, repo-wide scan, publish verification) requires opt-in flags (`--strict`, `--scan`). An agent broke the release pipeline by consuming changesets locally — VG validated version correctness but missed the publish gap because enforcement was behind flags.

**Root cause**: An enforcement tool that doesn't enforce by default is not enforcing.

## 2. Design Principle

> Every check that CAN run SHOULD run by default.
> Config is for turning things OFF, not ON.

## 3. Versioning Decision

| Question | Decision | Vote |
|----------|----------|------|
| SemVer or CalVer for VG packaging? | **Stay SemVer** | 9-0 unanimous |
| Should T008 ship as v1.0.0? | **Yes** | 9-0 unanimous |

**Rationale**: npm `^`/`~` ranges are structurally incompatible with CalVer. A versioning enforcement tool with broken version semantics undermines credibility. 1.0.0 signals production readiness and changes ecosystem tooling behavior.

**Stability policy** (publish alongside 1.0.0): "1.x maintains backward compatibility for all CLI commands and configuration formats. Breaking changes only occur in 2.0+."

## 4. Architecture Changes

### 4.1 Validation Modes

| Mode | Checks | Used By |
|------|--------|---------|
| `full` (default) | version, sync, changelog, scan, guard, publish | CLI, CI, pre-push hook |
| `lightweight` | version, sync | pre-commit hook |

### 4.2 New Config Sections

```yaml
# All enabled by default — opt OUT via config
guard:
  enabled: true          # hook bypass detection

publish:
  enabled: true          # registry publish status verification
  timeout: 5000          # ms, fail-open on timeout

scan:
  enabled: true          # repo-wide stale version detection (was false)
```

### 4.3 CLI Flag Changes

| Flag | Before | After |
|------|--------|-------|
| `--strict` | Enables guard checks | **DEPRECATED** — guard runs by default, warn if used |
| `--scan` | Enables repo scan | **DEPRECATED** — scan runs by default, warn if used |
| `--hook=pre-commit` | Full validation | **Lightweight mode** (version + sync only) |
| `--hook=pre-push` | Full validation | Full validation (unchanged) |

### 4.4 DETECTION_TABLE Extension

Existing `DETECTION_TABLE` in `src/sources/resolve.ts` maps manifests to version providers. New `REGISTRY_TABLE` in `src/publish.ts` maps manifests to registry check commands:

| ManifestSourceType | Registry | Check Method |
|---|---|---|
| `package.json` | npm | `npm view <pkg>@<ver> version` (execSync, respects .npmrc) |
| `Cargo.toml` | crates.io | `https://crates.io/api/v1/crates/<name>/<ver>` (HTTP GET) |
| `pyproject.toml` | PyPI | `https://pypi.org/pypi/<name>/<ver>/json` (HTTP GET) |
| `composer.json` | Packagist | `https://repo.packagist.org/p2/<vendor>/<name>.json` (HTTP GET) |
| `pubspec.yaml` | pub.dev | `https://pub.dev/api/packages/<name>/versions/<ver>` (HTTP GET) |
| `pom.xml` | Maven Central | `https://search.maven.org/solrsearch/select?q=...` (HTTP GET) |
| `VERSION` | (none) | Skip |
| `git-tag` | (none) | Skip |

### 4.5 Publish Check Behavior

| Scenario | publishValid | Error? | Behavior |
|----------|-------------|--------|----------|
| Version NOT on registry | `true` | No | Normal — ready to publish |
| Version IS on registry | varies | Warning | Informational — already published |
| Network timeout | `true` | Warning msg | **Fail-open** — don't block offline devs |
| Registry unreachable | `true` | Warning msg | **Fail-open** — graceful degradation |
| No supported registry | `true` | No | Skip silently |

### 4.6 FullValidationResult Expansion

```typescript
interface FullValidationResult {
  valid: boolean;
  version: string;
  versionValid: boolean;
  syncValid: boolean;
  changelogValid: boolean;
  scanValid: boolean;           // NEW
  guardValid: boolean;          // NEW
  publishValid: boolean;        // NEW
  publishCheck?: PublishCheckResult;  // NEW — detailed info
  guardReport?: GuardReport;         // NEW — detailed info
  errors: string[];
}
```

## 5. New Types

### 5.1 GuardConfig

```typescript
interface GuardConfig {
  /** Enables hook bypass detection in validate. @defaultValue true */
  enabled: boolean;
}
```

### 5.2 PublishConfig

```typescript
interface PublishConfig {
  /** Enables registry publish status check. @defaultValue true */
  enabled: boolean;
  /** Timeout in ms for registry HTTP/CLI calls. @defaultValue 5000 */
  timeout: number;
  /** Override registry URL for private registries. @defaultValue undefined */
  registryUrl?: string;
}
```

### 5.3 PublishCheckResult

```typescript
interface PublishCheckResult {
  /** Whether the version exists on the registry. */
  published: boolean;
  /** Registry name (npm, crates.io, pypi, etc.). */
  registry: string;
  /** Package name as read from the manifest. */
  packageName?: string;
  /** Set when the check could not complete (network, timeout). */
  error?: string;
}
```

### 5.4 ValidateMode

```typescript
type ValidateMode = 'full' | 'lightweight';
```

## 6. Implementation Tasks

### Wave 1: Types + Publish Module (no existing code changes)

| Task | Description | Files | AC |
|------|-------------|-------|-----|
| T008.1 | Add GuardConfig, PublishConfig, PublishCheckResult, ValidateMode to types.ts | `src/types.ts` | Types compile, no runtime changes |
| T008.2 | Expand FullValidationResult with scanValid, guardValid, publishValid, publishCheck, guardReport | `src/types.ts` | Type includes all new fields |
| T008.3 | Create src/publish.ts with REGISTRY_TABLE and checkPublishStatus() | `src/publish.ts` (new) | npm check works via execSync, HTTP checks work via fetch, timeout handling, fail-open on error |
| T008.4 | Add publish check tests | `src/__tests__/publish.test.ts` (new) | Tests for npm mock, HTTP mock, timeout, offline, ecosystem detection, no-registry skip |

### Wave 2: Config + Core Validation (existing code changes)

| Task | Description | Files | AC |
|------|-------------|-------|-----|
| T008.5 | Update DEFAULT_CONFIG: scan.enabled=true, add guard and publish sections | `src/config.ts` | Defaults reflect strict-by-default, mergeDeep preserves user overrides |
| T008.6 | Restructure validate() with ValidateMode, run all checks in full mode | `src/index.ts` | validate() in full mode runs scan+guard+publish, lightweight skips them |
| T008.7 | Update doctor() to use expanded FullValidationResult | `src/index.ts` | DoctorReport includes new validity fields |
| T008.8 | Update existing validation tests for new result shape | `src/__tests__/index.test.ts` | All existing tests pass with new fields |

### Wave 3: CLI + Hooks (user-facing changes)

| Task | Description | Files | AC |
|------|-------------|-------|-----|
| T008.9 | Deprecate --strict/--scan flags with warning, route --hook=pre-commit to lightweight | `src/cli.ts` | Deprecated flags print warning, pre-commit is fast, pre-push is full |
| T008.10 | Update hook generation comments for mode clarity | `src/hooks.ts` | Generated hooks have clear comments about validation mode |
| T008.11 | Update init wizard to include guard/publish config sections | `src/init-wizard.ts` | Generated .versionguard.yml includes all config sections |
| T008.12 | Update CLI test assertions for new result shape and deprecation warnings | `src/__tests__/cli.test.ts` | All CLI tests pass, deprecation warning tested |

### Wave 4: Release + Documentation

| Task | Description | Files | AC |
|------|-------------|-------|-----|
| T008.13 | Update own .versionguard.yml with guard/publish config | `.versionguard.yml` | Dogfooding — own config uses all new sections |
| T008.14 | Update FEATURES.md, VISION.md with strict-by-default philosophy | `docs/FEATURES.md`, `docs/VISION.md` | Features table updated, VISION reflects new enforcement depth |
| T008.15 | Update README.md config example, commands table, remove --strict/--scan references | `README.md` | README reflects 1.0.0 behavior accurately |
| T008.16 | Create changeset, bump to 1.0.0, publish stability policy | `CHANGELOG.md`, `package.json` | v1.0.0 on npm with stability policy in README |
| T008.17 | Regenerate CKM, verify guard/publish topics appear | `docs/ckm.json` | `vg ckm guard` and `vg ckm publish` work |
| T008.18 | Build, full test suite green, CI green, npm published, GitHub Release created | All | 248+ tests pass, 0 vulnerabilities, CI+Release green |

## 7. Acceptance Criteria (Epic-Level)

1. `vg validate` runs scan, guard, and publish checks by default without any flags
2. DETECTION_TABLE extends to registry check commands (npm view, cargo search, pip index, etc.)
3. Publish status check verifies current version exists on the detected registry
4. `--strict` and `--scan` flags deprecated with warning (not removed yet — removal in 2.0)
5. Config provides opt-out for each check category (`scan.enabled`, `guard.enabled`, `publish.enabled`)
6. Pre-commit hook uses lightweight mode for speed, full validate runs in pre-push and CI
7. All checks fail-open on network errors (warning, not failure)
8. Ships as v1.0.0 with stability policy published
9. 0 vulnerabilities, 0 deprecation warnings in dependencies
10. All existing tests updated and passing, new tests for publish module

## 8. Breaking Changes

| Change | Migration |
|--------|-----------|
| `scan.enabled` default `false` → `true` | Users with `scan.enabled: false` in config are unaffected (mergeDeep). New installs get scanning by default. |
| Guard checks now default-on | Users who don't want guard checks add `guard.enabled: false` to config |
| Publish checks new (default-on) | Users who don't want publish checks add `publish.enabled: false` to config |
| `--strict` flag deprecated | Still works but prints warning. Config `guard.enabled: false` is the replacement. |
| `--scan` flag deprecated | Still works but prints warning. Config `scan.enabled: false` is the replacement. |
| `FullValidationResult` has new required fields | JSON consumers see new fields alongside existing ones. Existing fields unchanged. |
| `validate()` API has new optional `mode` parameter | Existing callers unaffected (default is 'full', same as current --strict+--scan behavior) |

## 9. Test Strategy

| Category | Count (est.) | Approach |
|----------|-------------|----------|
| Publish module unit tests | 8-10 | Mock execSync and fetch, test all registries, timeout, offline |
| Validation mode tests | 4-6 | Full vs lightweight, config opt-out |
| CLI deprecation tests | 2-3 | Warning messages for --strict/--scan |
| Existing test updates | ~20 | Add new fields to all FullValidationResult assertions |
| Integration smoke | 2-3 | End-to-end vg validate on our own repo |
| **Total new/modified** | **~40** | Target: 280+ tests total |

## 10. Dependencies

- Node.js 22+ (for built-in `fetch()` in registry HTTP checks)
- No new npm dependencies required
- Existing: `glob@13`, `commander@14`, `js-yaml@4`, `@clack/prompts`

## 11. Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Publish check slows down validate | Fail-open with 5s timeout, lightweight mode for pre-commit |
| Users surprised by new default strictness | Deprecation warnings on old flags, clear migration in CHANGELOG |
| Private registry auth issues | npm check uses execSync (inherits .npmrc), HTTP checks accept registryUrl override |
| CI breaks for existing users | scan/guard/publish all config-opt-out, mergeDeep preserves existing configs |
| Offline development blocked | All network checks fail-open (warning, not error) |
