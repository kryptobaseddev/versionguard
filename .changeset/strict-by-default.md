---
"@codluv/versionguard": major
---

Strict by default: validate runs all checks without flags

BREAKING CHANGES:
- `scan.enabled` now defaults to `true` (was `false`)
- Guard checks (hook bypass detection) now run by default via `guard.enabled: true`
- New publish status check verifies versions against ecosystem registries
- `--strict` and `--scan` CLI flags are deprecated (still work, print warnings)
- `validate()` and `doctor()` are now async (return Promises)
- `FullValidationResult` has new required fields: `scanValid`, `guardValid`, `publishValid`
- `DoctorReport` has new required fields: `scanValid`, `guardValid`, `publishValid`
- Pre-commit hooks now use lightweight mode (version + sync only) for speed

New features:
- Registry publish verification for npm, crates.io, PyPI, Packagist, pub.dev, Maven Central
- `ValidateMode`: 'full' (default) runs all checks, 'lightweight' for pre-commit hooks
- `GuardConfig`, `PublishConfig` types for opt-out configuration
- `REGISTRY_TABLE` maps manifest types to registry check functions
- `checkPublishStatus()` and `readPackageName()` public APIs
- Generated hook scripts now include validation mode comments

Migration:
- Users with `scan.enabled: false` in config are unaffected (mergeDeep preserves overrides)
- Add `guard.enabled: false` to disable guard checks
- Add `publish.enabled: false` to disable publish status checks
- All network checks fail-open (warning, not failure) for offline development
- Update callers of `validate()` and `doctor()` to await the returned Promise
