# AGENTS.md

Agent-facing contributor guide for `versionguard`.

## Project Snapshot
- Language: TypeScript (Node.js >= 18)
- Module output: full ESM package (`package.json` has `"type": "module"`)
- Source: `src/`
- Build output: `dist/`
- Build tool: Vite
- Tests: Vitest with V8 coverage
- Lint/format: ESLint + Biome
- Key config files: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `vite.config.ts`, `eslint.config.js`, `biome.json`, `.versionguard.yml`

## Install and Setup
```bash
npm install
npm run build
```

For iterative development:
```bash
npm run dev
```

## Build, Lint, and Test Commands

All major quality gates are wired into `package.json`.

### Build
```bash
npm run build
```

### Test
Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run a single test file:
```bash
npx vitest run src/__tests__/semver.test.ts
```

Run a single test by name:
```bash
npx vitest run src/__tests__/semver.test.ts -t "parses valid semantic versions"
```

Alternative npm passthrough for single test/case:
```bash
npm run test:watch -- src/__tests__/calver.test.ts -t "increments patch-based versions"
```

### Lint
Run the full lint stack:
```bash
npm run lint
```

Run Biome only:
```bash
npm run lint:biome
```

Run ESLint only:
```bash
npm run lint:eslint
```

Format the repo:
```bash
npm run format
```

### Typecheck
```bash
npm run typecheck
```

## Expected Agent Workflow
1. Read `package.json`, `tsconfig.json`, and `vite.config.ts` before edits.
2. Prefer focused changes in `src/` unless config/docs updates are required.
3. Run targeted Vitest files first, then full tests.
4. Run `npm run lint`, `npm test`, and `npm run build` before finishing.
5. Add or update tests in `src/__tests__/` when behavior changes.

## Code Style Conventions (Inferred from Codebase)

### Formatting
- 2-space indentation.
- Semicolons required.
- Single quotes for strings.
- Keep trailing commas in multiline literals where already used.
- Preserve short JSDoc blocks on exported APIs.

### Imports
- Group imports in this order:
  1. Node built-ins (`node:fs`, `node:path`, `node:child_process`)
  2. Third-party packages (`commander`, `chalk`, `glob`, `js-yaml`, `vitest`)
  3. Internal relative modules (`./types`, `../fix`)
- Prefer `node:`-prefixed built-in imports.
- Prefer `import type` for type-only imports.
- Avoid adding default exports unless there is a strong reason.

### Types and TypeScript
- Keep `strict` compatibility (`"strict": true`).
- Keep code compatible with ESM + bundler-style resolution.
- Add explicit types for exported function signatures.
- Reuse shared types/interfaces from `src/types.ts`.
- Use union literals for constrained values.
- Prefer `unknown` + narrowing over `any`; if needed, cast narrowly.
- Do not mark functions `async` unless they actually await.

### Naming
- `camelCase` for variables/functions.
- `PascalCase` for interfaces/types.
- `UPPER_SNAKE_CASE` for constants.
- Tests should use behavior-focused names.

### Error Handling
- Core/library modules throw `Error` with actionable messages.
- CLI layer catches errors, prints clear output, and exits non-zero.
- Include context in errors (file path, version, or value) when possible.
- Prefer structured result objects for recoverable validation states.

### File and I/O Patterns
- Current codebase is sync-heavy for file operations; match local patterns.
- Read/write text files with `'utf-8'`.
- Use `path.join(...)` for paths.
- Preserve newline-at-EOF when rewriting JSON/text files.
- Preserve executable shebang behavior for CLI-facing output when touching build configuration.

### CLI Output Conventions
- Keep output concise and actionable.
- Existing symbols/patterns:
  - success: `✓`
  - failure: `✗`
  - suggestions: bullets/arrows with direct commands

### Testing Conventions
- Tests live in `src/__tests__/` and use `.test.ts` suffix.
- Prefer Vitest imports (`describe`, `it`, `expect`, `vi`) over globals.
- Prefer `describe` + `it` structure.
- Cover both valid and invalid cases for parsers/validators.
- Add focused regression tests for bug fixes.
- For git-related features, use temp repos instead of mocking all behavior away.

## Architectural Notes
- Public API is re-exported through `src/index.ts`; keep exports stable.
- Version logic is domain-separated:
  - `src/semver.ts`
  - `src/calver.ts`
- Sync/fix/feedback/tag logic is split into dedicated modules under `src/`.
- Keep default configuration logic centralized in `src/config.ts`.
- `src/project.ts` owns package.json read/write helpers.
- `vite.config.ts` is the source of truth for bundling and test runner integration.

## Cursor and Copilot Rules

Checked for repository-local rule files:
- `.cursorrules`
- `.cursor/rules/`
- `.github/copilot-instructions.md`

No Cursor or Copilot rule files were found in this repository at generation time.

## Maintenance Notes
- Update command sections when scripts/config change.
- If Vite/Vitest/Biome/ESLint config changes, update this file.
- If Cursor/Copilot rule files are added later, summarize them here.
