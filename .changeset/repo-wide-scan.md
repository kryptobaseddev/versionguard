---
"@codluv/versionguard": minor
---

Add repo-wide version literal scanning (T003)

- New `scan` config block with `enabled`, `patterns`, and `allowlist` fields
- `scanRepoForVersions()` globs the entire repo (respecting .gitignore and ignore patterns)
- Default patterns detect version literals in code (`version = "1.2.3"`), Dockerfiles (`FROM node:18.0.0`), and GitHub Actions (`uses: action@v3.5.0`)
- Allowlist entries exclude intentional references by file glob with optional reason
- Binary files skipped by extension and null-byte detection
- `vg validate --scan` flag enables scanning for a single run
- `scan.enabled: true` in config enables permanent scanning
- CKM auto-generates `scan` topic from ScanConfig
- 12 new tests covering detection, allowlist, ignore, binary skip, and edge cases
