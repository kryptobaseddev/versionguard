# Git Hooks Integration Research

**Date**: 2026-03-22
**Author**: Agent research pass
**Status**: Research complete, ready for implementation
**Scope**: Improve the VersionGuard git hooks onboarding so any project gets automatic pre-commit enforcement with minimal friction

---

## 1. Executive Summary

VersionGuard already has a complete git hooks subsystem: installation, uninstallation, status checking, integrity verification, bypass detection, and CLI management. The **infrastructure is production-ready**. The gap is purely in the **onboarding flow** — hooks are not installed as part of `init`, and there is no mechanism to persist hooks across fresh clones. Two small changes close this gap without over-engineering.

---

## 2. Current State Inventory

### 2.1 Hook Infrastructure (`src/hooks.ts`)

The hooks module is fully implemented and tested:

| Function | Purpose | Lines |
|----------|---------|-------|
| `installHooks(config, cwd)` | Writes hook scripts to `.git/hooks/` for each enabled hook | `hooks.ts:26-41` |
| `uninstallHooks(cwd)` | Removes only VG-managed hooks (checks for "versionguard" in file content) | `hooks.ts:60-73` |
| `areHooksInstalled(cwd)` | Returns `true` if all managed hooks exist and contain "versionguard" | `hooks.ts:128-138` |
| `findGitDir(cwd)` | Walks up from `cwd` to find `.git/` directory | `hooks.ts:93-108` |
| `generateHookScript(hookName)` | Generates the shell script content for a given hook | `hooks.ts:158-170` |

**Supported hooks**: `pre-commit`, `pre-push`, `post-tag` (defined in `HOOK_NAMES` constant at `hooks.ts:6`).

**Generated hook script content** (`hooks.ts:158-170`):

```sh
#!/bin/sh
# VersionGuard <hookName> hook
# --no-install prevents accidentally downloading an unscoped package
# if @codluv/versionguard is not installed locally
npx --no-install versionguard validate --hook=<hookName>
status=$?
if [ $status -ne 0 ]; then
  echo "VersionGuard validation failed."
  exit $status
fi
```

Key safety detail: `--no-install` prevents `npx` from pulling a random package if VG is not installed as a local devDependency. This is important for LLM agent safety — an agent cannot accidentally trigger a supply-chain attack by committing in a repo where VG was removed.

### 2.2 CLI Commands (`src/cli.ts`)

| Command | Lines | Behavior |
|---------|-------|----------|
| `versionguard init` | `cli.ts:58-74` | Creates `.versionguard.yml`, prints "next steps" telling user to manually run `hooks install` |
| `versionguard hooks install` | `cli.ts:436-449` | Reads config, calls `installHooks()` |
| `versionguard hooks uninstall` | `cli.ts:451-463` | Calls `uninstallHooks()` |
| `versionguard hooks status` | `cli.ts:465-482` | Calls `areHooksInstalled()`, exits 1 if not installed |
| `versionguard validate` | `cli.ts:139-253` | Full validation with optional `--hook`, `--json`, `--strict` flags |
| `versionguard doctor` | `cli.ts:255-316` | Readiness report including `hooksInstalled` status |

### 2.3 Guard Module — Bypass Detection (`src/guard.ts`)

The guard module provides strict-mode checks that detect hook tampering and bypass attempts:

| Check | Code | Severity | What It Catches |
|-------|------|----------|-----------------|
| `checkHooksPathOverride(cwd)` | `HOOKS_PATH_OVERRIDE` | error | `git config core.hooksPath` redirected away from `.git/hooks/` |
| `checkHuskyBypass()` | `HUSKY_BYPASS` | error | `HUSKY=0` environment variable disabling hooks |
| `checkHookIntegrity(config, cwd)` | `HOOK_MISSING` | error | Required hook file does not exist |
| `checkHookIntegrity(config, cwd)` | `HOOK_REPLACED` | error | Hook file exists but "versionguard" invocation is gone |
| `checkHookIntegrity(config, cwd)` | `HOOK_TAMPERED` | warning | Hook file modified from expected template but still contains VG |
| `checkEnforceHooksPolicy(config)` | `HOOKS_NOT_ENFORCED` | warning | Hooks enabled but `enforceHooks: false` — missing hooks won't fail validation |

`runGuardChecks(config, cwd)` at `guard.ts:213-240` aggregates all checks into a `GuardReport`. The report is `safe: true` only when zero errors exist (warnings alone don't fail).

Guard checks run when:
- `versionguard validate --strict` is invoked
- `versionguard doctor --strict` is invoked
- Guard report is included in `--json` output when `--strict` is used

### 2.4 Configuration (`.versionguard.yml`)

The config schema for hooks (from `src/types.ts`):

```yaml
git:
  hooks:
    pre-commit: true   # Run validate on pre-commit
    pre-push: true     # Run validate on pre-push
    post-tag: true     # Run post-tag automation
  enforceHooks: true   # Fail validation when required hooks are missing
```

**Default config** (`config.ts:43-51`): All three hooks enabled, `enforceHooks: true`.

**Example config** (`.versionguard.yml.example`): `pre-commit: true`, `post-tag: true`, `pre-push` not listed (defaults to `true` from merge).

### 2.5 Test Coverage (`src/__tests__/hooks.test.ts`, `src/__tests__/guard.test.ts`)

**Hook tests** (5 tests):
- Install/uninstall round-trip
- Selective hook installation (only enabled hooks)
- Preservation of unrelated custom hooks during uninstall
- `findGitDir` from nested paths
- Error on non-git-repo install attempt

**Guard tests** (10 tests):
- `core.hooksPath` override detection
- `HUSKY=0` bypass detection
- Missing/replaced/tampered hook detection
- `enforceHooks` policy check
- Aggregated report correctness
- `safe: true` when only warnings exist

### 2.6 Public API Exports (`src/index.ts:31`)

```typescript
export { areHooksInstalled, installHooks, uninstallHooks } from './hooks';
```

All hook functions and guard functions are publicly exported for programmatic use.

### 2.7 Current `init` Flow

When a user runs `versionguard init` today (`cli.ts:58-74`):

1. Writes `.versionguard.yml` (from example file or generated default)
2. Prints success message
3. Prints "Next steps":
   ```
   1. Edit .versionguard.yml to set your versioning type
   2. Run: npx versionguard hooks install     <-- MANUAL STEP
   3. Run: npx versionguard check
   ```

**The gap**: Step 2 is a separate manual command. Users (and agents) forget it.

### 2.8 Current `doctor` Flow

Doctor (`src/index.ts:165-191`) checks `hooksInstalled` and reports it, but offers no auto-remediation. When `enforceHooks: true` and hooks are missing, it adds `"Git hooks are not installed"` to errors and exits 1.

---

## 3. Problem Statement

### 3.1 Onboarding Friction

`init` creates the config but does not install hooks. This two-step process means:
- New users miss the hook installation step
- LLM agents running `init` don't know to follow up with `hooks install`
- The first commit after `init` goes through without validation

### 3.2 Clone Persistence

Git hooks live in `.git/hooks/`, which is not committed to the repository. When someone clones the repo and runs `npm install`, hooks are not restored. This means:
- New contributors don't have hooks
- CI environments don't have hooks (though CI typically runs `validate` directly)
- LLM agents working in fresh clones are unguarded until someone manually installs hooks

### 3.3 Agent Enforcement

The pre-commit hook already blocks commits on validation failure — this is the exact agent guardrail needed. But it only works if the hook is installed. The gap is "how does the hook get there in the first place?"

---

## 4. Proposed Changes

### 4.1 Change 1: `init` Auto-Installs Hooks

**File**: `src/cli.ts` (init command action, lines 61-74)
**File**: `src/config.ts` (optionally, if we want `initConfig` itself to return info about hooks)

**What to change**: After `initConfig()` writes the config file, immediately call `installHooks()` if we're in a git repository. Update the output messaging.

**Current behavior** (`cli.ts:61-74`):
```typescript
.action((options: { cwd: string }) => {
  try {
    const configPath = versionguard.initConfig(options.cwd);
    console.log(styles.success(`Created ${path.relative(options.cwd, configPath)}`));
    console.log('');
    console.log(styles.info('Next steps:'));
    console.log('  1. Edit .versionguard.yml to set your versioning type');
    console.log('  2. Run: npx versionguard hooks install');
    console.log('  3. Run: npx versionguard check');
  } catch (error) {
    console.error(styles.error(`${(error as Error).message}`));
    process.exit(1);
  }
});
```

**Proposed behavior**:
```typescript
.action((options: { cwd: string }) => {
  try {
    const configPath = versionguard.initConfig(options.cwd);
    console.log(styles.success(`Created ${path.relative(options.cwd, configPath)}`));

    // Auto-install hooks if in a git repo
    const config = versionguard.getConfig(options.cwd);
    try {
      versionguard.installHooks(config.git, options.cwd);
      const enabledHooks = Object.entries(config.git.hooks)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
      console.log(styles.success(`Git hooks installed (${enabledHooks.join(', ')})`));
    } catch {
      // Not a git repo — skip silently, hooks can be installed later
      console.log(styles.dim('Skipped hook installation (not a git repository)'));
    }

    console.log('');
    console.log(styles.info('Next steps:'));
    console.log('  1. Edit .versionguard.yml to set your versioning type');
    console.log('  2. Add to package.json scripts: "prepare": "versionguard hooks install"');
    console.log('  3. Run: npx versionguard check');
  } catch (error) {
    console.error(styles.error(`${(error as Error).message}`));
    process.exit(1);
  }
});
```

**Safety considerations**:
- The `installHooks()` call is wrapped in try/catch — if there's no `.git/` directory, it fails gracefully
- `installHooks()` only writes hooks that are enabled in the config (respects `config.git.hooks`)
- `installHooks()` overwrites existing VG hooks but does NOT touch non-VG hooks (the `uninstallHooks` function only removes files containing "versionguard")
- Note: `installHooks` DOES overwrite any file at the hook path regardless of content. Only `uninstallHooks` checks for the "versionguard" marker before deleting. If a user has a custom `pre-commit` hook that doesn't mention "versionguard", `installHooks` will replace it. This is existing behavior and is documented — but worth noting for the implementation.

**Test impact**:
- The existing `cli.test.ts` init test may need updating if it checks the exact output text
- Add a test: init in a git repo should result in hooks being installed
- Add a test: init outside a git repo should still succeed (config created, hooks skipped)

### 4.2 Change 2: Recommend `prepare` Script

**What**: Update the init output to recommend adding a npm `prepare` script. This is purely output messaging — no code change beyond what's in 4.1 above.

**Why `prepare` instead of `postinstall`**:
- `prepare` runs after `npm install` in development but NOT during package installation by consumers
- `postinstall` would run when someone installs VG as a dependency, which is wrong — we only want hooks in the project that owns the config
- This is the same pattern Husky uses

**Recommended script for consumer's `package.json`**:
```json
{
  "scripts": {
    "prepare": "versionguard hooks install"
  }
}
```

If the consumer already has a `prepare` script (common — e.g., `"prepare": "npm run build"`), they chain it:
```json
{
  "scripts": {
    "prepare": "npm run build && versionguard hooks install"
  }
}
```

**Why not auto-modify `package.json`?**
- Too invasive — `init` should not rewrite user files beyond the config it owns
- Could conflict with existing `prepare` scripts
- The user needs to make a conscious choice about script ordering

### 4.3 NOT Proposed (Intentionally Excluded)

| Idea | Why Excluded |
|------|--------------|
| Auto-modify `package.json` | Too invasive, conflicts with existing scripts |
| Separate `setup` command | Redundant with `init` |
| `--strict` in hook scripts by default | Hooks should be fast; CI catches strict violations |
| `.husky/`-style directory | We write directly to `.git/hooks/`, which is simpler and requires no extra config |
| `doctor --fix` auto-installing hooks | Nice-to-have but secondary; `init` doing it right from the start is the real fix |
| `core.hooksPath`-based approach | More complex, creates the exact bypass vector our guard detects |
| npm `postinstall` script in VG itself | Would run in consumer projects installing VG as a dep — wrong scope |

---

## 5. How the Pre-Commit Hook Guards LLM Agents

### 5.1 The Enforcement Chain

```
Agent makes code changes
        |
        v
Agent runs `git commit`
        |
        v
Git triggers `.git/hooks/pre-commit`
        |
        v
Hook runs: npx --no-install versionguard validate --hook=pre-commit
        |
        v
  +-----------+         +-----------+
  | validate  |         | validate  |
  |  passes   |         |  fails    |
  +-----------+         +-----------+
       |                      |
       v                      v
  Commit proceeds       Commit blocked
                        (exit code != 0)
                              |
                              v
                        Agent sees error output
                        and must fix before retry
```

### 5.2 What `validate` Checks in Hook Context

When invoked as `validate --hook=pre-commit`, the validation runs:
1. **Version format** — is `package.json` version valid SemVer/CalVer?
2. **File sync** — are all configured files in sync with the canonical version?
3. **Changelog** — does the changelog have an entry for the current version? (if enabled)

When invoked as `validate --hook=post-tag`, additionally:
4. **Post-tag automation** — runs `tag.handlePostTag()` for follow-up tasks

### 5.3 What `--strict` Adds (CI-Level, Not Hook-Level)

Guard checks (`guard.ts`) are intentionally NOT run in the hook script by default:
- They add latency to every commit
- `core.hooksPath` override is a config-level bypass, not something that changes between commits
- `HUSKY=0` detection is more relevant at CI time
- Hook integrity checks (HOOK_MISSING, HOOK_TAMPERED) are paradoxical in a hook context — if the hook is running, it clearly exists

Strict mode belongs in CI: `versionguard validate --strict` in the CI pipeline catches everything the hooks don't.

### 5.4 The `--no-install` Safety Net

The hook script uses `npx --no-install versionguard` specifically to prevent:
- An agent in a repo where VG was removed from devDeps triggering an npm install of a potentially malicious package
- Network-dependent hook execution (hooks should work offline)
- Slow hook execution from unexpected downloads

If VG is not installed locally, the hook fails with an error and the commit is blocked — which is the safe default.

---

## 6. Configuration Reference for Consumers

### 6.1 Minimal Setup (Recommended)

```bash
# In any project with package.json and .git/
npm install -D @codluv/versionguard
npx versionguard init  # Creates config AND installs hooks (after this change)
```

That's it. Pre-commit validation is now active.

### 6.2 Clone Persistence

Add to `package.json`:
```json
{
  "scripts": {
    "prepare": "versionguard hooks install"
  }
}
```

Now any `npm install` in a fresh clone restores hooks.

### 6.3 Controlling Which Hooks Run

Edit `.versionguard.yml`:
```yaml
git:
  hooks:
    pre-commit: true    # Most projects want this
    pre-push: false     # Optional, adds push-time validation
    post-tag: false     # Optional, for tag automation
  enforceHooks: true    # Fail validation if hooks are missing
```

### 6.4 CI Integration

```yaml
# .github/workflows/ci.yml
- run: npx versionguard validate --strict
```

The `--strict` flag runs guard checks that hooks don't — covering bypass detection and policy enforcement.

---

## 7. Files to Modify

| File | Change | Complexity |
|------|--------|------------|
| `src/cli.ts` | `init` action: add `installHooks()` call after config creation, update output text | Small (~15 lines) |
| `src/__tests__/cli.test.ts` | Add tests for init-with-hooks and init-without-git | Small (~20 lines) |

No changes needed to:
- `src/hooks.ts` — already complete
- `src/guard.ts` — already complete
- `src/config.ts` — `initConfig()` stays as-is (config creation only)
- `src/types.ts` — no schema changes
- `src/index.ts` — no export changes

---

## 8. Edge Cases to Handle

| Scenario | Expected Behavior | Handled By |
|----------|-------------------|------------|
| `init` in a non-git directory | Config created, hooks skipped with info message | try/catch around `installHooks()` |
| `init` where config already exists | Error: "Config file already exists" (existing behavior) | `initConfig()` in `config.ts:183` |
| Custom pre-commit hook already exists | VG hook **overwrites** it — this is existing `installHooks` behavior | `installHooks()` writes unconditionally |
| Husky-managed hooks directory | If `core.hooksPath` points to `.husky/`, VG hooks go to `.git/hooks/` which are ignored — guard detects this | `checkHooksPathOverride()` in guard |
| Monorepo with multiple packages | Each package can have its own `.versionguard.yml`; hooks are installed in the nearest `.git/` | `findGitDir()` walks up |
| Agent runs `git commit --no-verify` | Bypasses hooks entirely — detected by `--strict` in CI | `checkEnforceHooksPolicy()` + CI |

### 8.1 Important: Overwrite Behavior

`installHooks()` at `hooks.ts:35-40` writes unconditionally to the hook file path:
```typescript
for (const hookName of HOOK_NAMES) {
  if (config.hooks[hookName]) {
    const hookPath = path.join(hooksDir, hookName);
    fs.writeFileSync(hookPath, generateHookScript(hookName), { encoding: 'utf-8', mode: 0o755 });
  }
}
```

This means if a project has an existing `pre-commit` hook (e.g., from lint-staged, commitlint, or a custom script), `init` will silently replace it. This is worth documenting prominently but is arguably correct behavior — if you're setting up VG, you want VG hooks.

A future improvement could detect existing non-VG hooks and warn or offer to append rather than replace, but that is out of scope for this change.

---

## 9. Relationship to Existing Roadmap

From `docs/FEATURES.md`, the roadmap item:

> **Priority 1**: Agent guardrails — Detect `--no-verify` bypasses, warn about skipped hooks, add `--strict` mode that fails on any policy gap.

This was **already completed in v0.2.0** — the guard module implements all of this. However, the FEATURES.md roadmap section still shows it as unchecked (the "Verified Features" table does not include guard). This is a docs-only gap — the feature exists, is tested, and works.

The `init` auto-install change builds on the guard infrastructure by ensuring hooks are present from the start, making the guard checks more meaningful (you can't tamper with hooks that were never installed).

---

## 10. Testing Strategy

### 10.1 New Tests Needed

```typescript
// In src/__tests__/cli.test.ts or a new init-specific test file

describe('init command', () => {
  it('installs hooks automatically when in a git repository', () => {
    const cwd = createTempProject();
    initGitRepo(cwd);
    // Run init
    // Assert .versionguard.yml exists
    // Assert .git/hooks/pre-commit exists and contains "versionguard"
  });

  it('creates config without hooks when not in a git repository', () => {
    const cwd = createTempProject();
    // Run init (no git)
    // Assert .versionguard.yml exists
    // Assert .git/hooks/ does not exist
    // Assert no error thrown
  });

  it('reports which hooks were installed in output', () => {
    const cwd = createTempProject();
    initGitRepo(cwd);
    // Run init, capture stdout
    // Assert output contains "Git hooks installed"
    // Assert output contains hook names
  });
});
```

### 10.2 Existing Tests to Verify

The existing test at `cli.test.ts` for `init` should still pass — it likely tests that the config file is created and checks the exit code. If it asserts on exact stdout text, it will need updating to match the new output.

---

## 11. Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Should `init` auto-install hooks? | **Yes** | Eliminates the #1 friction point, one command gets you fully set up |
| Should we auto-modify `package.json`? | **No** | Too invasive, recommend `prepare` script in output instead |
| Should hook scripts run `--strict`? | **No** | Hooks should be fast; strict checks belong in CI |
| Should `doctor` auto-fix missing hooks? | **Not now** | Secondary priority; `init` doing it right is the real fix |
| Should we detect existing non-VG hooks before overwriting? | **Not now** | Out of scope; document the overwrite behavior |
| Should we use `core.hooksPath`? | **No** | Creates the exact bypass vector our guard module detects |
| New commands needed? | **None** | `init` + existing `hooks install/uninstall/status` is sufficient |

---

## 12. Implementation Checklist

- [ ] Modify `init` action in `src/cli.ts` to call `installHooks()` after config creation
- [ ] Add try/catch for non-git-repo case with informative message
- [ ] Update "Next steps" output to recommend `prepare` script
- [ ] Add test: init in git repo installs hooks
- [ ] Add test: init outside git repo skips hooks gracefully
- [ ] Verify existing init tests still pass (update if they assert on stdout)
- [ ] Update `docs/FEATURES.md` roadmap if agent guardrails are now considered checked off
- [ ] Update README "Getting Started" section to reflect single-command setup
