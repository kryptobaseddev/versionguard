---
"@codluv/versionguard": minor
---

Add changelog structure enforcement and `vg` CLI alias

- Added `changelog.enforceStructure` config to validate section headers against an allowed list
- Added `changelog.sections` config for custom section whitelists (defaults to Keep a Changelog: Added, Changed, Deprecated, Removed, Fixed, Security)
- Empty changelog sections are detected and reported
- Added `vg` as a CLI alias for `versionguard` — shorter to type, same functionality
- CLI help text now shows `vg` as the primary command name
- 7 new changelog structure enforcement tests (225 total)
