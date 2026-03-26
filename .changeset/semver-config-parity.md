---
"@codluv/versionguard": minor
---

Add SemVerConfig for symmetric versioning configuration

- Added `SemVerConfig` interface with `allowVPrefix`, `allowBuildMetadata`, and `requirePrerelease` knobs
- `schemeRules.allowedModifiers` now validates SemVer prerelease tags (was CalVer-only)
- Config always ships both `semver:` and `calver:` blocks — `type` is the switch, no commenting/uncommenting needed
- Extracted shared modifier validation into `scheme-rules.ts` (DRY across both versioning strategies)
- Interactive wizard shows SemVer options when semver is selected
- Headless init supports `--allow-v-prefix`, `--no-build-metadata`, `--require-prerelease` flags
- CKM automatically generates a `semver` topic from the new `SemVerConfig` interface
- 20 new tests covering all SemVer config knobs and schemeRules integration
