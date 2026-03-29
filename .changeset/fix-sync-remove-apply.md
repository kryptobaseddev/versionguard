---
"@codluv/versionguard": minor
---

fix: sync regex no longer corrupts nested JSON version keys (fixes #10)

JSON sync targets now use structural parsing instead of regex, only updating the
top-level "version" field. The default sync regex also adds a negative lookbehind
to prevent matching dotted paths like `scripts.version` in non-JSON files.

breaking: remove `bump --apply` flag (closes #8, #9)

`vg bump` is now suggest-only. Version writing to manifests is the responsibility
of release automation tools like Changesets — not an enforcement tool. The broken
`--apply` flag that couldn't write TOML (#8) and picked wrong options (#9) has
been removed entirely rather than fixed, because it violated VG's integration
philosophy.

breaking: remove deprecated `--strict` and `--scan` flags

All checks run by default since v1.0.0. These flags were dead code. Using them
now produces an "unknown option" error instead of a silent deprecation warning.
