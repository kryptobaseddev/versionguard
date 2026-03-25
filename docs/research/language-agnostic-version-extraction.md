# Research: Language-Agnostic Version Extraction for VersionGuard

**Date**: 2026-03-25
**Status**: Research complete, ready for design phase
**Scope**: Making VersionGuard capable of reading/writing version numbers from any project type

---

## Table of Contents

1. [Manifest Formats by Language](#1-manifest-formats-by-language)
2. [Existing npm Packages for Parsing](#2-existing-npm-packages-for-parsing)
3. [Tree-sitter Feasibility](#3-tree-sitter-feasibility)
4. [AST Needs Assessment](#4-ast-needs-assessment)
5. [Auto-Detection Strategy](#5-auto-detection-strategy)
6. [Recommendations](#6-recommendations)

---

## 1. Manifest Formats by Language

### Complete Reference Table

| Language | Manifest File | Version Field / Path | Format | Parseable With | Difficulty |
|----------|--------------|---------------------|--------|---------------|------------|
| **Node.js** | `package.json` | `.version` | JSON | `JSON.parse` (built-in) | Trivial |
| **Rust** | `Cargo.toml` | `[package]` > `version` | TOML | TOML parser | Easy |
| **Python** | `pyproject.toml` | `[project]` > `version` | TOML | TOML parser | Easy |
| **Python** | `setup.cfg` | `[metadata]` > `version` | INI | INI parser or regex | Easy |
| **Python** | `setup.py` | `setup(version="...")` | Python source | Regex | Medium |
| **Go** | `go.mod` | N/A (uses Git tags) | Custom | N/A | Special case |
| **Java** | `pom.xml` | `<project><version>` | XML | XML parser | Easy |
| **Java** | `build.gradle` | `version = '...'` | Groovy DSL | Regex or gradle-to-js | Medium |
| **Java** | `build.gradle.kts` | `version = "..."` | Kotlin DSL | Regex | Medium |
| **Java** | `gradle.properties` | `version=...` | Properties/INI | Line-based parse | Easy |
| **Ruby** | `*.gemspec` | `s.version = '...'` | Ruby source | Regex | Medium |
| **Ruby** | `lib/*/version.rb` | `VERSION = '...'` | Ruby source | Regex | Medium |
| **C#** | `*.csproj` | `<PropertyGroup><Version>` | XML | XML parser | Easy |
| **Swift** | `Package.swift` | N/A (uses Git tags) | Swift source | N/A | Special case |
| **PHP** | `composer.json` | `.version` | JSON | `JSON.parse` (built-in) | Trivial |
| **Dart** | `pubspec.yaml` | `version:` | YAML | YAML parser | Easy |
| **Elixir** | `mix.exs` | `version:` in `project/0` | Elixir source | Regex | Medium |

### Detailed Notes Per Language

#### Rust (`Cargo.toml`)
- Path: `package.version` (TOML dotted key) or `[package]` table > `version` key
- Always a string in semver format (e.g., `"0.1.0"`)
- **Workspace inheritance**: Member crates can use `version.workspace = true`, inheriting from the root `Cargo.toml`'s `[workspace.package]` section. VersionGuard should detect this and follow the reference.
- Default if absent: `"0.0.0"`

#### Python (`pyproject.toml`)
- **Static version**: `[project]` > `version = "1.2.3"` (PEP 621 standard)
- **Dynamic version**: `[project]` > `dynamic = ["version"]` means the build backend computes it. Common patterns:
  - setuptools: `[tool.setuptools.dynamic]` > `version = {attr = "pkg.__version__"}`
  - Poetry: `[tool.poetry]` > `version = "1.0"`
- **Recommendation**: Support the static `[project].version` path. Dynamic versions are intentionally computed at build time and should be flagged as "unable to extract statically."

#### Python (`setup.cfg`)
- INI-like format: `[metadata]` section > `version` key
- Straightforward line-based or INI parsing

#### Python (`setup.py`)
- Executable Python: `setup(version="1.0.0")` within a function call
- Must use regex, never execute: `version\s*=\s*['"]([^'"]+)['"]`
- This is a legacy format; `pyproject.toml` is the modern standard

#### Go (`go.mod`)
- **Go does NOT store a package version in go.mod.** The module version is determined entirely by Git tags (e.g., `v1.2.3`).
- `go.mod` contains: `module` path, `go` directive (minimum Go version, e.g., `go 1.21`), `toolchain` directive, and `require` directives for dependencies.
- **Recommendation**: For Go projects, VersionGuard should read the version from Git tags rather than a manifest file. This is a fundamentally different model. Consider supporting a "version source: git-tag" mode.

#### Java (`pom.xml`)
- XML path: `<project><version>1.0.0-SNAPSHOT</version></project>`
- Can also inherit from `<parent><version>`, which adds complexity
- Maven properties like `${project.version}` or `${revision}` are common for multi-module builds

#### Java (`build.gradle` / `build.gradle.kts`)
- Top-level property: `version = '1.0.0'` (Groovy) or `version = "1.0.0"` (Kotlin)
- Can also be in `gradle.properties`: `version=1.0.0-SNAPSHOT`
- Groovy and Kotlin DSLs are full programming languages; version can be computed dynamically
- **Recommendation**: Support `gradle.properties` first (trivial INI-like parse), then regex for `build.gradle`/`build.gradle.kts`

#### Ruby (`*.gemspec`)
- Inside a `Gem::Specification.new` block: `s.version = '1.0.0'` or `spec.version = "1.0.0"`
- Often delegates to a constant: `s.version = MyGem::VERSION` where `VERSION` is defined in `lib/mygem/version.rb`
- Must use regex; never evaluate Ruby source
- Regex: `\.version\s*=\s*['"]([^'"]+)['"]`

#### C# (`.csproj`)
- MSBuild XML: `<PropertyGroup><Version>1.0.0</Version></PropertyGroup>`
- Related properties: `VersionPrefix`, `VersionSuffix`, `PackageVersion`
- Setting `<Version>` explicitly overrides prefix/suffix
- **Recommendation**: Read `<Version>` from `<PropertyGroup>`. Fall back to `<VersionPrefix>` + `<VersionSuffix>` if `<Version>` is absent.

#### Swift (`Package.swift`)
- **Swift Package Manager does NOT store a version in Package.swift.** Package versions are determined by Git tags, similar to Go.
- `Package.swift` only contains `// swift-tools-version:` (the SPM tools version, not the package version) and dependency version constraints.
- **Recommendation**: Same as Go -- version from Git tags. This is another "version source: git-tag" language.

#### PHP (`composer.json`)
- JSON field: `"version": "4.0.1"`
- **However**: The version field is optional and actively discouraged for packages published on Packagist (the version comes from VCS tags instead)
- Libraries often omit it; applications sometimes include it
- **Recommendation**: Support reading it when present, but recognize it may be absent. For Packagist packages, version comes from Git tags.

#### Dart (`pubspec.yaml`)
- YAML field: `version: 1.0.0+1` (semver with optional build number after `+`)
- The `+N` suffix is the build number, used by app stores
- Straightforward YAML parse

#### Elixir (`mix.exs`)
- Elixir source file with a `project/0` function returning a keyword list: `version: "0.1.0"`
- Must use regex: `version:\s*"([^"]+)"`
- The file is executable Elixir, but the version is almost always a string literal

---

## 2. Existing npm Packages for Parsing

### Format-Specific Parsers

#### TOML Parsers (for Cargo.toml, pyproject.toml)

| Package | Version | Weekly Downloads | TOML Spec | ESM | Zero-dep | Serialize | Notes |
|---------|---------|-----------------|-----------|-----|----------|-----------|-------|
| **smol-toml** | 1.6.0 | ~6.8M | v1.1.0 | Yes | Yes | Yes | **Recommended.** Fastest spec-compliant parser. Actively maintained. |
| **@iarna/toml** | 2.2.5 | ~5M (est.) | v1.0.0 | No (CJS) | Yes | Yes | Battle-tested but unmaintained (6+ years). |
| **toml** | 3.0.0 | ~1M (est.) | v0.4.0 | No | Yes | No | Outdated spec. Parse only. 7 years unmaintained. |
| **fast-toml** | 0.5.4 | Low | v0.5.0 | No | Yes | No | Outdated spec. Sacrifices compliance for speed. |

**Verdict**: `smol-toml` is the clear winner. It is the most downloaded TOML parser on npm, ESM-native, zero-dependency, supports both parsing and serialization (needed for write-back), and tracks the latest TOML spec. VersionGuard already uses `js-yaml` which is also ESM; `smol-toml` fits the same pattern.

#### XML Parsers (for pom.xml, .csproj)

| Package | Version | Weekly Downloads | ESM | Zero-dep | Build XML | Notes |
|---------|---------|-----------------|-----|----------|-----------|-------|
| **fast-xml-parser** | 5.5.9 | ~41-52M | Yes (v5+) | Yes | Yes | **Recommended.** Most popular, actively maintained, parse + build. |
| **@rgrove/parse-xml** | 4.x | ~200K | Yes | Yes | No | Parse only, strict XML. |
| **xml2js** | 0.6.x | ~20M | No (CJS) | No | Yes | Callback-based, heavier. |
| **htmlparser2** | ~9.x | ~30M | Yes | No | No | More for HTML; XML mode exists but not ideal. |

**Verdict**: `fast-xml-parser` is the clear winner. It handles both parsing and building (needed for write-back to pom.xml/.csproj), is ESM-compatible, zero-dependency, and has massive adoption.

#### YAML Parsers (for pubspec.yaml)

VersionGuard already depends on `js-yaml` (used for `.versionguard.yml` config loading). No new dependency needed. `js-yaml` supports both `load()` and `dump()` for read/write.

#### INI / Properties Parsers (for setup.cfg, gradle.properties)

| Package | Notes |
|---------|-------|
| **ini** (npm) | Simple INI parser/serializer. Widely used (~20M downloads/week). |
| **confbox** | Wraps js-yaml, smol-toml, ini, json5, jsonc-parser under a unified API. |
| Line-based regex | For `.properties` files, a simple `key=value` line parser is trivial to implement with no dependency. |

**Verdict**: `setup.cfg` and `gradle.properties` are simple enough that a few lines of regex/split logic suffice. No new dependency strictly needed. If you want a robust INI parser, `ini` is the standard choice.

#### Gradle Parsers (for build.gradle)

| Package | Version | Downloads | Notes |
|---------|---------|-----------|-------|
| **gradle-to-js** | 2.0.1 | ~380K/week | Self-described "quick & dirty." Groovy DSL only, no Kotlin DSL. 4 years unmaintained. |

**Verdict**: Not recommended as a dependency. For extracting just the `version` property, regex is more reliable and lighter. Pattern: `version\s*=\s*['"]([^'"]+)['"]`

#### Multi-Format Wrapper: confbox

`confbox` (from the UnJS ecosystem) wraps `smol-toml`, `js-yaml`, `jsonc-parser`, `json5`, and `ini` behind a unified API with subpath exports (`confbox/toml`, `confbox/yaml`, etc.).

**Pros**: Single dependency for TOML + YAML + INI + JSON. Tree-shakeable subpath exports.
**Cons**: Adds an abstraction layer. VersionGuard already uses `js-yaml` directly. The TOML parsing is just `smol-toml` underneath.

**Verdict**: Not recommended. Adding `smol-toml` and `fast-xml-parser` individually gives VersionGuard more control and avoids an unnecessary wrapper. VersionGuard's use case is specific (extract version from known paths), not general config parsing.

### Packages NOT to Use

| Package | Why Not |
|---------|---------|
| **@snyk/package-manager-detection** | Detects which *package manager* to use, not version extraction. Snyk-specific. 0 dependents. |
| **detect-package-manager** | Detects npm vs yarn vs pnpm. Not relevant. |
| **gradle-to-js** | Unmaintained, "quick & dirty" self-description. Regex is better for our use case. |
| **@iarna/toml** | Unmaintained. smol-toml is strictly better. |

---

## 3. Tree-sitter Feasibility

### What Tree-sitter Is

Tree-sitter is an **incremental parsing system** designed for code editors. It builds concrete syntax trees (CSTs) for source code and can efficiently update them as the source is edited. It supports dozens of grammars including TOML, YAML, Ruby, Elixir, Python, Groovy, Kotlin, and Swift.

### Tree-sitter TOML Grammar

A `@tree-sitter-grammars/tree-sitter-toml` npm package exists. It would let you build a full syntax tree of a TOML file and query for `(pair (bare_key) @key (string) @value)` where `@key == "version"`.

### Is Tree-sitter Appropriate for VersionGuard?

**No. Tree-sitter is overkill for this use case.** Here is the reasoning:

1. **The task is structured data extraction, not code intelligence.** VersionGuard needs to read a single field from a known path in a structured data file. This is a lookup operation, not a code analysis operation.

2. **Tree-sitter's strengths are irrelevant here:**
   - *Incremental parsing*: VersionGuard reads a file once, extracts a version, done. No incremental updates.
   - *Error recovery*: If a manifest file is malformed, VersionGuard should report an error, not try to partially parse it.
   - *Multi-language uniformity*: Appealing in theory, but in practice each manifest format has different structural conventions. A TOML `[package].version` lookup is nothing like an XML `<project><version>` traversal. The tree-sitter query language would be different for each grammar anyway.

3. **Massive dependency weight:**
   - Tree-sitter runtime: native binary (~2MB compiled)
   - Each grammar: additional native module (~500KB-1MB each)
   - Would need: TOML, YAML, XML, Ruby, Elixir, Python, Groovy/Kotlin grammars = 7+ native modules
   - Total: ~10MB+ of native binaries for what a 50KB TOML parser can do
   - Requires native compilation (node-gyp / prebuild), which breaks in many CI environments

4. **Format-specific parsers are simpler AND more correct:**
   - `smol-toml` understands TOML semantics (inline tables, dotted keys, multiline strings). Tree-sitter only gives you syntax nodes.
   - `fast-xml-parser` understands XML namespaces, attributes, CDATA. Tree-sitter gives you a raw parse tree you would have to interpret.
   - `JSON.parse` is built into every JS runtime. Tree-sitter for JSON would be absurd.

5. **The only case where tree-sitter might help** is for source-code manifests (gemspec, mix.exs, setup.py, build.gradle) where no format-specific parser exists. But regex handles these adequately for single-field extraction, and tree-sitter would still require native compilation.

### Verdict

**Do not use tree-sitter.** The cost/benefit ratio is heavily negative. Format-specific parsers + regex cover 100% of the use cases with a fraction of the complexity.

---

## 4. AST Needs Assessment

### Core Question

> Does VersionGuard need an AST to read a version string from a manifest file and optionally write it back?

### Answer: No.

The manifest formats fall into three categories, none of which require AST construction:

### Category A: Structured Data Formats (parsed natively)

| Format | Parser | Read | Write | AST needed? |
|--------|--------|------|-------|-------------|
| JSON (`package.json`, `composer.json`) | `JSON.parse` / `JSON.stringify` | `obj.version` | `obj.version = x` | No |
| TOML (`Cargo.toml`, `pyproject.toml`) | `smol-toml` parse/stringify | `obj.package.version` | `obj.package.version = x` | No |
| YAML (`pubspec.yaml`) | `js-yaml` load/dump | `obj.version` | `obj.version = x` | No |
| XML (`pom.xml`, `.csproj`) | `fast-xml-parser` parse/build | Navigate to `<version>` element | Modify and rebuild | No |
| INI (`setup.cfg`, `gradle.properties`) | Line-based parse or `ini` | `obj.metadata.version` | `obj.metadata.version = x` | No |

All of these have well-established parsers that produce plain JavaScript objects. You access the version via a known key path. No syntax tree traversal needed.

### Category B: Source Code Manifests (regex extraction)

| Format | Example Pattern | Read | Write |
|--------|----------------|------|-------|
| `setup.py` | `version\s*=\s*['"]([^'"]+)['"]` | Regex match group 1 | Regex replace |
| `*.gemspec` | `\.version\s*=\s*['"]([^'"]+)['"]` | Regex match group 1 | Regex replace |
| `mix.exs` | `version:\s*"([^"]+)"` | Regex match group 1 | Regex replace |
| `build.gradle` | `version\s*=\s*['"]([^'"]+)['"]` | Regex match group 1 | Regex replace |
| `build.gradle.kts` | `version\s*=\s*"([^"]+)"` | Regex match group 1 | Regex replace |
| `lib/*/version.rb` | `VERSION\s*=\s*['"]([^'"]+)['"]` | Regex match group 1 | Regex replace |

These are programming language source files where the version is (almost always) a string literal on a predictable line. Regex extraction is the industry-standard approach (used by pip, Gemnasium, Snyk, Dependabot, and others). An AST would be overkill and would require language-specific parsers.

### Category C: Git Tag-Based (no file to parse)

| Language | Why |
|----------|-----|
| Go | Version comes exclusively from Git tags. `go.mod` has no version field. |
| Swift | SPM uses Git tags for package versions. `Package.swift` has no version field. |
| PHP (Packagist) | `composer.json` version field is optional/discouraged; Packagist uses Git tags. |

For these, VersionGuard would need a "git tag" version source rather than a file parser.

### Write-Back Considerations

Write-back (updating the version in a manifest file) has one important constraint: **preserve formatting.** Users care about indentation, comments, and key ordering. This affects parser choice:

- **JSON**: `JSON.stringify(obj, null, 2)` is acceptable (VersionGuard already does this for `package.json`)
- **TOML**: `smol-toml` stringify produces valid TOML but may not preserve original formatting. For write-back, a targeted regex replacement on the raw text (find the `version = "..."` line and replace) may be better than full parse-modify-serialize.
- **YAML**: Same concern as TOML. `js-yaml` dump does not preserve comments.
- **XML**: `fast-xml-parser` can preserve formatting with `format: true` and careful options.
- **Regex-based**: Inherently preserves formatting since it only touches the matched region.

**Recommendation for write-back**: Use a hybrid approach. Parse to validate/read, but for writes, use targeted regex replacement on the raw file text to preserve formatting. This is the pattern VersionGuard's `sync.ts` already uses.

---

## 5. Auto-Detection Strategy

### File-Existence Detection

The simplest and most reliable auto-detection approach is checking for the existence of known manifest files. This is exactly what Snyk, Dependabot, Renovate, and every other multi-language tool does.

### Proposed Detection Table (priority order within each language)

```
Manifest File           -> Language   -> Version Source
-------------------------------------------------------------
package.json            -> Node.js    -> JSON .version
Cargo.toml              -> Rust       -> TOML [package].version
pyproject.toml          -> Python     -> TOML [project].version
setup.cfg               -> Python     -> INI [metadata].version
setup.py                -> Python     -> Regex
go.mod                  -> Go         -> Git tags (no file version)
pom.xml                 -> Java       -> XML <project><version>
build.gradle            -> Java       -> Regex / gradle.properties
build.gradle.kts        -> Java       -> Regex / gradle.properties
*.gemspec               -> Ruby       -> Regex
*.csproj                -> C#         -> XML <PropertyGroup><Version>
Package.swift           -> Swift      -> Git tags (no file version)
composer.json           -> PHP        -> JSON .version (if present)
pubspec.yaml            -> Dart       -> YAML .version
mix.exs                 -> Elixir     -> Regex
```

### Detection Algorithm

```
1. Scan project root for known manifest filenames
2. If multiple found, use priority:
   a. If package.json exists AND another manifest exists,
      check if this is a polyglot project (e.g., JS bindings for a Rust crate)
   b. Return all detected manifests, let user configure which is primary
3. For glob-based detection (*.gemspec, *.csproj):
   a. Use fast glob to find matching files
   b. If multiple .csproj found, likely a .NET solution -- detect .sln
4. Config override: .versionguard.yml should allow explicit manifest specification
```

### Configuration Extension

The `.versionguard.yml` config should be extended to support:

```yaml
# Current (Node.js only, implicit)
versioning:
  type: semver

# Proposed extension
manifest:
  # Auto-detect (default) or explicit
  file: "Cargo.toml"                    # explicit path
  # OR
  file: auto                            # scan for known manifests

  # For structured formats, the key path to the version
  versionPath: "package.version"        # TOML dotted path

  # For source-code formats, the regex to extract version
  versionRegex: 'version:\s*"([^"]+)"'  # capture group 1 = version

  # For git-tag-based languages
  source: "file"                        # or "git-tag"
```

### Monorepo / Polyglot Support

Many real-world projects have multiple manifests:
- A Rust project with JS bindings: `Cargo.toml` + `package.json`
- A Python project with JS tooling: `pyproject.toml` + `package.json`
- A Java + JS monorepo: `pom.xml` + `package.json`

VersionGuard should:
1. Auto-detect all manifests present
2. Allow configuration of which is the "primary" version source
3. Validate that all manifests agree on the version (cross-manifest sync check)

---

## 6. Recommendations

### Minimal Viable Approach

**Phase 1 -- Structured format support (low effort, high value)**

Add support for the formats that have proper parsers. These cover the majority of the ecosystem.

| Format | New Dependency | Effort |
|--------|---------------|--------|
| TOML (Cargo.toml, pyproject.toml) | `smol-toml` | Small |
| XML (pom.xml, .csproj) | `fast-xml-parser` | Small |
| YAML (pubspec.yaml) | None (already have `js-yaml`) | Small |
| JSON (composer.json) | None (built-in) | Trivial |
| INI (setup.cfg, gradle.properties) | None (line-based parse) | Small |

**New production dependencies: 2** (`smol-toml`, `fast-xml-parser`)
**Combined install size**: ~150KB (both are zero-dependency)

**Phase 2 -- Regex-based source file support (medium effort)**

Add regex extractors for source-code manifests.

| Format | Approach | Effort |
|--------|----------|--------|
| `build.gradle` / `build.gradle.kts` | Regex | Small |
| `*.gemspec` / `version.rb` | Regex | Small |
| `mix.exs` | Regex | Small |
| `setup.py` | Regex | Small |

**New dependencies: 0** (all regex-based)

**Phase 3 -- Git tag version source (medium effort)**

Add a "git tag" version source for Go and Swift projects where the version is not in any file.

**Phase 4 -- Auto-detection and config extension**

Implement the file-existence detection algorithm and extend `.versionguard.yml` to support multi-language configuration.

### Package Recommendations Summary

| Purpose | Package | Why |
|---------|---------|-----|
| TOML parse/serialize | **`smol-toml`** | Fastest, spec-compliant (v1.1.0), ESM, zero-dep, actively maintained, 6.8M downloads/week |
| XML parse/build | **`fast-xml-parser`** | Most popular (41M+ downloads/week), ESM (v5+), zero-dep, parse + build, actively maintained |
| YAML parse/dump | **`js-yaml`** (existing) | Already a dependency. No change needed. |
| JSON parse/stringify | **Built-in** | `JSON.parse` / `JSON.stringify`. No dependency. |
| INI/Properties | **None** | Trivial to implement with string split. Or use `ini` package if robustness needed. |
| Gradle DSL | **Regex** | `gradle-to-js` is unmaintained and "quick & dirty." Regex is better for single-field extraction. |
| Ruby/Elixir source | **Regex** | Industry standard approach (used by pip, Gemnasium, Snyk, Dependabot). |

### What NOT to Use

| Tool/Package | Why Not |
|-------------|---------|
| **tree-sitter** | Massive native dependency (~10MB+), requires compilation, overkill for field extraction from structured data. Provides no benefit over format-specific parsers. |
| **confbox** | Unnecessary wrapper. We need smol-toml and js-yaml directly, not through an abstraction. |
| **@iarna/toml** | Unmaintained for 6+ years. smol-toml is strictly superior. |
| **gradle-to-js** | Unmaintained, self-described "quick & dirty," Groovy-only. |
| **@snyk/package-manager-detection** | Detects package managers, not versions. Different problem. |

### Architecture Sketch

The recommended architecture follows VersionGuard's existing pattern in `project.ts`:

```
ManifestReader (interface)
  +readVersion(cwd: string): string
  +writeVersion(version: string, cwd: string): void

JsonManifestReader    -- package.json, composer.json
TomlManifestReader    -- Cargo.toml, pyproject.toml
YamlManifestReader    -- pubspec.yaml
XmlManifestReader     -- pom.xml, *.csproj
IniManifestReader     -- setup.cfg, gradle.properties
RegexManifestReader   -- setup.py, *.gemspec, mix.exs, build.gradle
GitTagReader          -- Go, Swift (reads version from git tags)

ManifestDetector
  +detect(cwd: string): ManifestInfo[]
  +primary(cwd: string): ManifestReader
```

Each reader takes a config object specifying the file path and the version field location (JSON path, TOML dotted key, XML element path, or regex pattern). This keeps the core generic while allowing per-language customization.

---

## Sources

### Manifest Documentation
- [The Cargo Book - Manifest Format](https://doc.rust-lang.org/cargo/reference/manifest.html)
- [Python Packaging - Writing pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
- [Go Modules Reference](https://go.dev/ref/mod)
- [Maven POM Reference](https://maven.apache.org/pom.html)
- [RubyGems Specification Reference](https://guides.rubygems.org/specification-reference/)
- [MSBuild Properties for .NET SDK](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props)
- [Swift Package Manager - PackageDescription](https://docs.swift.org/package-manager/PackageDescription/PackageDescription.html)
- [Composer.json Schema](https://getcomposer.org/doc/04-schema.md)
- [Dart pubspec File](https://dart.dev/tools/pub/pubspec)
- [Elixir Mix](https://elixirschool.com/en/lessons/basics/mix)

### npm Packages
- [smol-toml on npm](https://www.npmjs.com/package/smol-toml)
- [smol-toml on GitHub](https://github.com/squirrelchat/smol-toml)
- [fast-xml-parser on npm](https://www.npmjs.com/package/fast-xml-parser)
- [fast-xml-parser on GitHub](https://github.com/NaturalIntelligence/fast-xml-parser)
- [confbox on npm](https://www.npmjs.com/package/confbox)
- [confbox on GitHub](https://github.com/unjs/confbox)
- [@iarna/toml on npm](https://www.npmjs.com/package/@iarna/toml)
- [gradle-to-js on npm](https://www.npmjs.com/package/gradle-to-js)
- [@snyk/package-manager-detection on npm](https://www.npmjs.com/package/@snyk/package-manager-detection)

### Tree-sitter
- [tree-sitter on GitHub](https://github.com/tree-sitter/tree-sitter)
- [tree-sitter-toml on GitHub](https://github.com/ikatyang/tree-sitter-toml)
- [@tree-sitter-grammars/tree-sitter-toml on npm](https://www.npmjs.com/package/@tree-sitter-grammars/tree-sitter-toml)

### Approaches / Prior Art
- [Snyk CLI - Package Manager Detection (DeepWiki)](https://deepwiki.com/snyk/cli/5-package-manager-and-project-detection)
- [Gemnasium Parser - Regex-based gemspec parsing](https://github.com/gemnasium/gemnasium-parser)
- [Python Single-sourcing Package Version](https://packaging.python.org/guides/single-sourcing-package-version/)
- [Go Module Version Numbering](https://go.dev/doc/modules/version-numbers)
- [Defining Versions in Ruby Gems](https://alexpeattie.com/blog/defining-versions-in-ruby-gems/)
- [Version vs VersionSuffix vs PackageVersion in .NET](https://andrewlock.net/version-vs-versionsuffix-vs-packageversion-what-do-they-all-mean/)
