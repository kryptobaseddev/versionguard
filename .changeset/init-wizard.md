---
"@codluv/versionguard": minor
---

feat: interactive init wizard + headless CLI flags

Interactive mode (`versionguard init`) walks users through versioning type, CalVer format selection, manifest source, git hooks, and changelog configuration using @clack/prompts.

Headless mode for LLMs and CI:
- `versionguard init --type calver --format YYYY.M.MICRO`
- `versionguard init --manifest Cargo.toml --yes`
- `versionguard init --no-hooks --no-changelog --yes`

New flags: `--type`, `--format`, `--manifest`, `--hooks`/`--no-hooks`, `--changelog`/`--no-changelog`, `--yes`
