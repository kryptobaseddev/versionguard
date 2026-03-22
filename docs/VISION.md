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

## Design Principles

- **Single source of truth**: the canonical version comes from `package.json`
- **Protocol-first strictness**: SemVer and CalVer rules are enforced opinionatedly
- **Actionable feedback**: every failure should explain what is wrong and how to fix it
- **Low-config adoption**: setup should stay small and readable
- **Safe automation**: automate deterministic fixes, never hide risky changes
- **Agent resistance**: workflows should reduce drift, shortcuts, and silent bypasses
- **Narrow scope**: do one category of work exceptionally well instead of expanding into general CI/CD

## What VersionGuard Must Do

### Enforce version protocol correctness

VersionGuard must support two first-class modes:

- SemVer
- CalVer

SemVer expectations:

- strict `MAJOR.MINOR.PATCH` validation
- prerelease and build metadata support
- no leading-zero drift in numeric segments
- deterministic comparison and increment helpers

CalVer expectations:

- configurable formats such as `YYYY.MM.DD`, `YYYY.MM.PATCH`, `YY.M.PATCH`, and `YYYY.0M.0D`
- range validation for month and day
- prevention of future-dated versions when configured
- deterministic chronological comparison and increment helpers

### Keep repository files in sync

VersionGuard must detect and correct version drift across configured files.

That includes:

- glob-based file selection
- regex-based version matching
- deterministic replacement templates
- validation that flags mismatches before release actions complete

### Validate changelog discipline

VersionGuard should embed Keep a Changelog expectations directly into the workflow.

Minimum behavior:

- require `# Changelog`
- require `## [Unreleased]`
- require an entry for the current version when configured
- validate release header date shape
- help generate missing entries when safe

### Integrate with git workflow boundaries

VersionGuard should enforce policy where it matters most:

- before commits
- before pushes
- after tags

These hooks should be easy to install and hard to misread.
They should fail clearly when policy is violated.

### Support release automation

VersionGuard should make normal release actions safer, not more manual.

That includes:

- suggested bumps
- package version updates
- file sync automation
- changelog repair when possible
- tag creation that preserves version consistency

## How It Should Feel

VersionGuard should feel like a strict release copilot.

It should:

- stop incorrect actions early
- explain the exact problem
- point to the next command to run
- make the right path easier than the wrong one

The tone should be direct, practical, and a little opinionated.
It should never make people guess what happened.

## Audience

The primary audience is teams building TypeScript and Node.js projects where `package.json` is already the natural release anchor.

The secondary audience is agent-assisted development workflows where automated contributors need hard boundaries around versioning behavior.

## Non-Goals

VersionGuard is not trying to be:

- a full release orchestration platform
- a replacement for general-purpose CI systems
- a monorepo package manager
- a language-agnostic solution at launch

Those may inform future integrations, but they are not the product center.

## Architecture Direction

The implementation should stay modular and boring in the best possible way.

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

This stack keeps the project modern, fast, and aligned with the intended TypeScript-first audience.

## Success Criteria

VersionGuard is successful when teams can honestly say:

- "Our package version, tags, changelog, and synced files no longer drift."
- "Agents do not silently bypass version policy anymore."
- "Release failures tell us exactly what to fix."
- "Versioning overhead dropped because the rules are encoded in tooling."

## Long-Term Direction

The long-term opportunity is not to broaden endlessly.
It is to deepen confidence.

That means:

- stronger anti-bypass protections for agent-heavy workflows
- richer changelog automation without sacrificing determinism
- better repo scanning for accidental version hardcoding
- more precise policy controls while keeping the config small
- tighter CI integration for teams that need central enforcement

## Vision Summary

VersionGuard is intentionally narrow.

It should do one job extremely well:

enforce protocol-correct, synchronized, changelog-aware versioning from a single source of truth so humans and LLM agents can ship without release chaos.
