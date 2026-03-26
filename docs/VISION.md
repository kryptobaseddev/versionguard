# VersionGuard Vision

## Product Intent

VersionGuard exists to make versioning discipline automatic, strict, and difficult to bypass in repositories where both humans and LLM agents contribute code.

The product promise is simple:

- `package.json` stays the single source of truth for version state
- SemVer and CalVer rules are enforced, not merely suggested
- changelog, tags, and synced files stay aligned with the declared version
- failures are actionable, not cryptic

## The Problem

Release hygiene breaks down in predictable ways, especially when agents are involved.

Common failure modes:

- versions get hardcoded in multiple files and drift apart
- git tags do not match the package version
- changelog entries are missing, malformed, or stale
- semantic and calendar versioning rules are violated under time pressure
- automation bypasses policy because guardrails are too loose or too noisy

These are not cosmetic issues. They create broken release metadata, low trust in automation, and wasted time during every release.

## The Core Thesis

Versioning should feel like infrastructure, not ceremony.

Developers should be able to:

1. install one dependency
2. add one small config file
3. continue shipping normally while VersionGuard enforces policy in the background

The goal is not to give people more release steps.
The goal is to remove avoidable version mistakes from the workflow entirely.

## Where VersionGuard Runs

VersionGuard enforces at three points in the development lifecycle:

1. **Local dev (git hooks):** `pre-commit` and `pre-push` hooks run `vg validate` automatically. This catches version drift, changelog issues, and sync mismatches before code leaves the developer's machine. This is the primary enforcement point.

2. **CI (GitHub Actions):** `vg validate` runs as a build gate in CI. This catches anything the hooks missed (hooks can be skipped with `--no-verify`), validates on every PR, and ensures automated dependency PRs (e.g. Dependabot) don't break version consistency.

3. **CLI (developer workflow):** `vg check`, `vg fix`, `vg sync`, `vg tag`, `vg doctor` — manual commands that developers and agents use during the release flow.

The layered enforcement means mistakes are caught at the cheapest point (locally), backstopped by CI, and repairable through the CLI.

## Who Needs VersionGuard

- **Any project that ships versioned software** and wants to stop version-related drift: stale install commands in docs, missing changelog entries, hardcoded version strings in CI configs or Dockerfiles, tag/manifest mismatches
- **Teams using AI agents** that modify code — VG is the guardrail that catches when agents skip versioning steps or leave the repo in an inconsistent release state
- **Polyglot projects** that need consistent version governance across npm, Rust, Python, Dart, PHP, Java, and more

## Design Principles

- **Single source of truth**: the canonical version comes from `package.json`
- **Protocol-first strictness**: SemVer and CalVer rules are enforced opinionatedly
- **Actionable feedback**: every failure explains what is wrong and how to fix it
- **Low-config adoption**: setup stays small and readable
- **Safe automation**: deterministic fixes are automated, risky changes are not hidden
- **Agent resistance**: workflows reduce drift, shortcuts, and silent bypasses
- **Narrow scope**: the tool stays focused on version governance instead of expanding into general CI/CD
- **Complementary by design**: VersionGuard validates and enforces; it does not own release automation, version selection, or publishing

## Integration Philosophy

VersionGuard is an enforcement layer, not a release automation tool.

Release automation tools like [Changesets](https://github.com/changesets/changesets) decide what the next version should be, write changelog entries, update `package.json`, and publish to registries. VersionGuard does none of those things. It validates the result.

The boundary is:

| Concern | Release automation (e.g. Changesets) | VersionGuard |
| --- | --- | --- |
| Choose the next version | Yes | No |
| Update `package.json` | Yes | No (reads it as source of truth) |
| Write changelog entries | Yes | No |
| Publish to npm | Yes | No |
| Validate version format | No | Yes |
| Validate changelog structure | No | Yes |
| Sync version across files | No | Yes |
| Scan for hardcoded version drift | No | Yes |
| Enforce policy via git hooks | No | Yes |
| Block unsafe tag/release actions | No | Yes |
| Detect agent bypasses | No | Yes |

VersionGuard should never duplicate what release automation already does well. It should make the output of release automation trustworthy by catching mistakes that automation tools do not check for.

This means VersionGuard will never:

- own a "version bump" workflow that replaces changesets or semantic-release
- generate changelog content from commit history
- publish packages to registries
- manage release branches or merge strategies

It will always:

- validate that versions conform to SemVer or CalVer rules
- validate that changelog structure follows Keep a Changelog
- detect version drift across configured and scanned files
- enforce policy at git boundaries where mistakes are cheapest to catch
- provide actionable feedback that points to the exact fix

## Achieved Now

VersionGuard already delivers the core of the product vision.

### Protocol enforcement

- SemVer is supported with strict parsing, validation, comparison, and increment helpers
- CalVer is supported with multiple formats, date validation, future-date prevention, comparison, and increment helpers
- invalid versions are rejected with actionable messages instead of vague failures

### Source-of-truth and sync behavior

- `package.json` is the canonical version source
- configured files can be kept in sync through regex/template rules
- configured files are scanned for version mismatches before release actions complete
- changelog `Unreleased` sections are protected from false mismatch reports

### Changelog and release hygiene

- Keep a Changelog structure is validated
- current-version changelog entries can be required
- missing changelog entries can be created through fix helpers
- release tags are validated against package version and changelog state

### Git workflow enforcement

- managed `pre-commit`, `pre-push`, and `post-tag` hooks can be installed
- tag creation refuses unsafe states such as dirty worktrees, missing hooks when enforced, duplicate tags, sync drift, and invalid changelog state
- remote tag/push readiness is covered by integration tests

### CLI and automation

- the CLI supports `init`, `check`, `validate`, `doctor`, `sync`, `fix`, `bump`, `tag`, and hook management commands
- `doctor --json` and `validate --json` support CI and agent workflows
- actionable feedback and deterministic fix flows are available in both the API and CLI

### Repository/tooling quality

- the project ships as a full ESM package
- builds use Vite
- tests use Vitest
- formatting and linting use Biome and ESLint
- Forge is installed, initialized, locked, hooked, and fully passing

## Partially Achieved

Some parts of the vision are present, but not yet complete at the deepest level.

### Agent resistance

- VersionGuard now blocks many unsafe release paths
- however, it does not yet make bypasses impossible in every workflow or environment

### Hardcoded version detection

- configured-file scanning works well
- broader repo-wide accidental version literal detection beyond configured sync patterns is still limited

### Changelog enforcement

- changelog validation and repair helpers exist
- changelog authoring is intentionally left to release automation tools like Changesets
- VersionGuard validates changelog structure, it does not generate changelog content

### Release workflow strictness

- release guardrails are strong
- there is still room for more opinionated commit policy (e.g. detecting `--no-verify` bypasses, requiring clean version-bump commits before tagging)

## Future Direction

The long-term opportunity is not to broaden endlessly.
It is to deepen confidence in the enforcement lane.

That means:

- stronger anti-bypass protections for agent-heavy workflows (detect `--no-verify`, warn about skipped hooks, strict mode)
- broader repo scanning for accidental version hardcoding beyond configured sync files
- more precise policy controls while keeping the config small
- safer release commit policies (require clean version-bump commits, detect amended history)
- tighter CI integration for teams that need central enforcement

It does not mean:

- building release automation that duplicates Changesets, semantic-release, or similar tools
- generating changelog content from commit history
- managing publish pipelines or registry authentication

## Architecture Direction

The implementation stays modular and boring in the best possible way.

Core layers:

- protocol modules for SemVer and CalVer
- config loading and defaulting
- sync engine for file scanning and replacement
- changelog validator and entry helper
- feedback engine for actionable diagnostics
- fix engine for deterministic remediation
- hook and tag integration for git workflow enforcement
- CLI surface designed for both human and agent use

## Tooling Direction

The repository itself should model the same discipline it expects from consumers.

Current engineering direction:

- full ESM package output
- Vite-based builds
- Vitest for testing
- Biome for formatting and baseline linting
- ESLint for semantic TypeScript linting
- Forge for TSDoc enforcement and documentation generation

This stack keeps the project modern, fast, and aligned with the intended TypeScript-first audience.

## Success Criteria

VersionGuard is successful when teams can honestly say:

- "Our package version, tags, changelog, and synced files no longer drift."
- "Agents do not silently bypass version policy anymore."
- "Release failures tell us exactly what to fix."
- "Versioning overhead dropped because the rules are encoded in tooling."

## Vision Summary

VersionGuard is intentionally narrow.

It should do one job extremely well:

enforce protocol-correct, synchronized, changelog-aware versioning from a single source of truth so humans and LLM agents can ship without release chaos.
