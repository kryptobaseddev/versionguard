---
"@codluv/versionguard": minor
---

Add GitHub Dependabot config generation (T007)

- New `github.dependabot` config field (default: `true`) — opinionated default for GitHub-hosted projects
- `vg init` wizard generates `.github/dependabot.yml` from detected manifests automatically
- Shared `MANIFEST_TO_ECOSYSTEM` mapping reuses VG's existing ecosystem detection (DRY)
- Supports all VG manifest types: npm, cargo, pip, pub, composer, maven
- Always includes `github-actions` ecosystem entry
- Minor+patch grouped into single PRs for clean PR lists
- `--no-github` headless flag to opt out
- `vg doctor` warns when dependabot config is enabled but file is missing
- CKM auto-generates `github` topic from `GitHubConfig`
- 11 new tests (248 total)
