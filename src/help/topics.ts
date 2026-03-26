/**
 * Embedded help topics for the CLI help system.
 *
 * @remarks
 * Content is compiled into the binary at build time.
 * Structured for MVI progressive disclosure:
 * - Level 0: Topic list (versionguard help)
 * - Level 1: Topic summary (versionguard help calver)
 * - Level 2: Full API context (versionguard help --llm)
 *
 * @packageDocumentation
 */

/**
 * A single help topic entry for the CLI help system.
 *
 * @public
 * @since 0.4.0
 */
export interface HelpTopic {
  /** Short name used as CLI argument. */
  name: string;
  /** One-line summary shown in topic list. */
  summary: string;
  /** Full help text for the topic. */
  content: string;
}

/**
 * All available CLI help topics, compiled into the binary at build time.
 *
 * @public
 * @since 0.4.0
 */
export const TOPICS: HelpTopic[] = [
  {
    name: 'config',
    summary: 'Configuration schema (.versionguard.yml)',
    content: `# Configuration Reference

VersionGuard is configured via .versionguard.yml in the project root.

## Schema

versioning:
  type: semver | calver
  schemeRules:
    maxNumericSegments: 3
    allowedModifiers: [dev, alpha, beta, rc]
  calver:
    format: "YYYY.M.MICRO"       # Any valid token combination
    preventFutureDates: true
    strictMutualExclusion: true

manifest:
  source: auto | package.json | Cargo.toml | pyproject.toml | pubspec.yaml |
          composer.json | pom.xml | VERSION | git-tag | custom
  path: "version"                # Dotted key path override
  regex: "..."                   # For custom/pom.xml sources

sync:
  files: ["README.md", "CHANGELOG.md"]
  patterns:
    - regex: '(version\\s*[=:]\\s*["\\''])(.+?)(["\\''])'
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

## Commands

  versionguard init          Interactive setup wizard
  versionguard init --yes    Headless defaults
  versionguard validate      CI gate
  versionguard doctor        Full readiness check
  versionguard fix           Auto-fix all issues
  versionguard fix-changelog Fix Changesets mangling`,
  },
  {
    name: 'calver',
    summary: 'Calendar versioning tokens and formats',
    content: `# CalVer Token Reference

VersionGuard supports the full calver.org specification.

## Tokens

  Year:    YYYY (2026)  | YY (26)   | 0Y (06)
  Month:   MM (3)       | M (3)     | 0M (03)
  Week:    WW (12)      | 0W (03)        # Mutually exclusive with Month/Day
  Day:     DD (5)       | D (5)     | 0D (05)
  Counter: MICRO (0)    | PATCH (0)      # Must be last segment

MICRO and PATCH are identical — MICRO is the calver.org standard name,
PATCH is the SemVer-familiar alias.

## Common Formats

  YYYY.M.MICRO       calver.org standard         2026.3.0
  YYYY.MM.MICRO      padded month                2026.03.0
  YY.0M.MICRO        Twisted/pip style           26.03.0
  YYYY.0M.0D         certifi/date-based          2026.03.26
  YYYY.0M.0D.MICRO   youtube-dl style            2026.03.26.0
  YY.0M              Ubuntu style                26.03
  YYYY.WW.MICRO      week-based                  2026.13.0

## Modifiers (Pre-release)

  Appended with a hyphen: 2026.3.0-alpha.1, 2026.3.0-rc2
  Validated against schemeRules.allowedModifiers whitelist.

## Validation Rules

  1. Year token must be the first segment
  2. Week and Month/Day are mutually exclusive
  3. Counter (MICRO/PATCH) must be the last segment
  4. Strict regex: MM matches 1-12 only, DD matches 1-31 only
  5. preventFutureDates rejects versions ahead of current date`,
  },
  {
    name: 'manifest',
    summary: 'Supported version sources (language-agnostic)',
    content: `# Manifest Source Reference

VersionGuard reads versions from any project manifest, not just package.json.

## Auto-Detection Priority

When manifest.source is "auto" (the default), scans in order:
  1. package.json      Node.js / Bun      (path: version)
  2. Cargo.toml        Rust               (path: package.version)
  3. pyproject.toml     Python             (path: project.version)
  4. pubspec.yaml       Dart / Flutter     (path: version)
  5. composer.json      PHP                (path: version)
  6. pom.xml            Java / Maven       (regex-based)
  7. VERSION            Plain text file    (first line)

## Explicit Configuration

  manifest:
    source: Cargo.toml
    path: package.version     # Override the dotted key path

  manifest:
    source: pyproject.toml
    path: tool.poetry.version  # Poetry layout

  manifest:
    source: git-tag            # Go, Swift (version from tags)

  manifest:
    source: custom
    path: my-config.toml
    regex: 'version\\s*=\\s*"([^"]+)"'

## Providers

  JsonVersionSource      package.json, composer.json
  TomlVersionSource      Cargo.toml, pyproject.toml (via smol-toml)
  YamlVersionSource      pubspec.yaml (via js-yaml)
  VersionFileSource      VERSION (plain text, first line)
  GitTagSource           Git tags (Go/Swift, read-only from tags)
  RegexVersionSource     gemspec, mix.exs, build.gradle, setup.py`,
  },
  {
    name: 'hooks',
    summary: 'Git hook installation and cooperation',
    content: `# Git Hooks Reference

VersionGuard installs git hooks that validate on commit and push.

## Installed Hooks

  pre-commit   Runs versionguard validate --hook=pre-commit
  pre-push     Runs versionguard validate --hook=pre-push
  post-tag     Runs versionguard validate --hook=post-tag

## Cooperative Installation

VG appends its block to existing hooks instead of overwriting:

  #!/bin/sh
  # husky
  npx lint-staged           # Existing Husky hook preserved

  # >>> versionguard >>>    # VG block appended with markers
  npx --no-install versionguard validate --hook=pre-commit
  # <<< versionguard <<<

Works with: Husky, lefthook, pre-commit (Python), overcommit (Ruby)

## Commands

  versionguard hooks install    Install/update hooks (idempotent)
  versionguard hooks uninstall  Remove only VG blocks (preserves others)
  versionguard hooks status     Check if VG hooks are present

## Guard Checks (--strict mode)

  HOOKS_PATH_OVERRIDE    core.hooksPath redirecting away from .git/hooks
  HUSKY_BYPASS           HUSKY=0 environment variable
  HOOK_MISSING           Required hooks not installed
  HOOK_REPLACED          Hook overwritten without VG invocation
  HOOK_TAMPERED          Hook modified from expected template
  HOOKS_NOT_ENFORCED     Hooks enabled but enforceHooks is false`,
  },
  {
    name: 'changelog',
    summary: 'Changelog validation and Changesets integration',
    content: `# Changelog Reference

VersionGuard enforces Keep a Changelog (keepachangelog.com) format.

## Required Structure

  # Changelog

  ## [Unreleased]

  ## [0.4.0] - 2026-03-26

  ### Added
  - New feature

  ### Fixed
  - Bug fix

  [Unreleased]: https://github.com/org/repo/compare/v0.4.0...HEAD
  [0.4.0]: https://github.com/org/repo/releases/tag/v0.4.0

## Validation Rules (strict mode)

  1. Must start with "# Changelog"
  2. Must have ## [Unreleased] section
  3. Version entries must use ## [X.Y.Z] - YYYY-MM-DD format
  4. Must include compare links at the bottom
  5. requireEntry: current version must have an entry

## Changesets Integration

Changesets (@changesets/cli) mangles Keep a Changelog format by
prepending content above the header. VersionGuard detects and fixes this:

  versionguard fix-changelog    Fix mangled format
  versionguard fix              Also runs changelog fix automatically

The fixer:
  - Converts ## 0.4.0 → ## [0.4.0] - YYYY-MM-DD
  - Converts "Minor Changes" → "Added", "Patch Changes" → "Fixed"
  - Strips commit hashes (ec39479: feat: X → X)
  - Updates compare links
  - Restores preamble to correct position`,
  },
];
