---
"@codluv/versionguard": minor
---

feat: CKM help system, project root detection, changelog auto-fixer, cooperative hooks

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
