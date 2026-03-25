---
"@codluv/versionguard": patch
---

fix: address remaining audit findings for version source providers

- **DRY refactor**: Extract shared `getNestedValue`, `setNestedValue`, `escapeRegExp` to `src/sources/utils.ts`; consolidate `getCalVerConfig` in types.ts (M-002, M-003, L-009)
- **Feedback**: Replace all `npm version` fix suggestions with `npx versionguard fix --version` for language-agnostic support (M-001)
- **Git-tag provider**: Auto-detect tag prefix convention (`v` vs bare); filter for version-like tags using `--match` (H-005, L-006)
- **TOML write-back**: Handle dotted key syntax and inline table format (M-004, M-010)
- **JSON provider**: Detect and preserve original indentation when writing (M-008)
- **YAML provider**: Support nested dotted key paths (L-005)
- **VERSION file**: Validate first-line only; reject binary files (L-003, L-004)
- **Auto-detection**: Throw clear error with guidance when no manifest found instead of silent fallback (M-009)
- **setNestedValue**: Throw on missing intermediate keys instead of silently creating them (L-001)
