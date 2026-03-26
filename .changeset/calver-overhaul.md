---
"@codluv/versionguard": minor
---

feat: full calver.org specification with MICRO token, strict regex, MODIFIER support

- `MICRO` accepted as CalVer-standard alias for `PATCH` (identical behavior)
- CalVerFormat is now any valid dot-separated token combination (not a hardcoded enum)
- New tokens: `0Y` (zero-padded short year), `WW`/`0W` (week of year)
- Strict token regex patterns enforce value-level constraints at parse time (MM: 1-12, DD: 1-31)
- MODIFIER support: parse and format pre-release suffixes (`-alpha.1`, `-rc2`, `-dev`)
- `schemeRules.allowedModifiers`: whitelist valid modifier tags in config
- `schemeRules.maxNumericSegments`: warn when format exceeds configured segment count
- Format validation via `isValidCalVerFormat()` with structural rules
