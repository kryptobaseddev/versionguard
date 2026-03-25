---
"@codluv/versionguard": minor
---

feat: language-agnostic version source providers

VersionGuard can now read and write version strings from any project type, not just package.json.

**New providers:**
- `JsonVersionSource` — package.json, composer.json
- `TomlVersionSource` — Cargo.toml, pyproject.toml (via smol-toml)
- `YamlVersionSource` — pubspec.yaml
- `VersionFileSource` — plain text VERSION files
- `GitTagSource` — Go, Swift (read-only from git tags)
- `RegexVersionSource` — gemspec, mix.exs, build.gradle, setup.py

**Configuration:**
```yaml
# .versionguard.yml
manifest:
  source: auto          # or "Cargo.toml", "pyproject.toml", "git-tag", etc.
  path: package.version # dotted key path (provider-specific)
```

**Auto-detection:** When `source: auto` (the default), VersionGuard scans for known manifest files in priority order: package.json → Cargo.toml → pyproject.toml → pubspec.yaml → composer.json → pom.xml → VERSION.

**Security hardening:**
- Path traversal protection for custom manifest paths
- Regex capture group validation
- Config source type validation
- Position-based regex replacement to prevent file corruption

**Backwards compatible:** Existing package.json workflows work without any config changes.

**New dependency:** `smol-toml` (zero-dep, ESM, TOML v1.1 parser)
