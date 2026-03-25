import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { findGitDir, generateHookScript } from './hooks';
import type { VersionGuardConfig } from './types';

const HOOK_NAMES = ['pre-commit', 'pre-push', 'post-tag'] as const;

/**
 * Describes a single guard finding.
 *
 * @public
 * @since 0.2.0
 */
export interface GuardWarning {
  /** Machine-readable code for filtering and automation. */
  code: string;
  /** Severity: errors block releases, warnings inform. */
  severity: 'error' | 'warning';
  /** Human-readable description of the issue. */
  message: string;
  /**
   * Suggested remediation command when available.
   *
   * @defaultValue `undefined`
   */
  fix?: string;
}

/**
 * Result of a full guard check pass.
 *
 * @public
 * @since 0.2.0
 */
export interface GuardReport {
  /** True when no errors were found. Warnings alone do not fail. */
  safe: boolean;
  /** All findings from the guard check. */
  warnings: GuardWarning[];
}

/**
 * Checks whether git hooks have been redirected away from the repository.
 *
 * @remarks
 * When `core.hooksPath` is set to a non-default location, git hooks installed
 * in `.git/hooks/` are silently ignored. This is a common bypass vector.
 *
 * @param cwd - Repository directory to inspect.
 * @returns A guard warning when a hooksPath override is detected.
 *
 * @example
 * ```ts
 * import { checkHooksPathOverride } from './guard';
 *
 * const warning = checkHooksPathOverride(process.cwd());
 * if (warning) console.warn(warning.message);
 * ```
 *
 * @public
 * @since 0.2.0
 */
export function checkHooksPathOverride(cwd: string): GuardWarning | null {
  try {
    // Safe: hardcoded command, no user input
    const hooksPath = execSync('git config core.hooksPath', {
      cwd,
      encoding: 'utf-8',
    }).trim();

    if (hooksPath) {
      // Resolve the hooks path relative to the project root and check if
      // it points to a legitimate .husky directory inside the project.
      // A bare substring check would let /tmp/.husky-fake bypass the error.
      const resolved = path.resolve(cwd, hooksPath);
      const huskyDir = path.resolve(cwd, '.husky');
      if (resolved === huskyDir || resolved.startsWith(`${huskyDir}${path.sep}`)) {
        return {
          code: 'HOOKS_PATH_HUSKY',
          severity: 'warning',
          message: `Husky detected — core.hooksPath is set to "${hooksPath}". Hooks in .git/hooks/ are bypassed. Add versionguard validate to your .husky/pre-commit manually or use a tool like forge-ts that manages .husky/ hooks cooperatively.`,
        };
      }

      return {
        code: 'HOOKS_PATH_OVERRIDE',
        severity: 'error',
        message: `git core.hooksPath is set to "${hooksPath}" — hooks in .git/hooks/ are bypassed`,
        fix: 'git config --unset core.hooksPath',
      };
    }
  } catch {
    // core.hooksPath not set — this is the expected state
  }

  return null;
}

/**
 * Checks whether the HUSKY environment variable is disabling hooks.
 *
 * @remarks
 * Setting `HUSKY=0` is a documented way to disable Husky hooks. Since
 * VersionGuard hooks may run alongside or through Husky, this bypass
 * can silently disable enforcement.
 *
 * @returns A guard warning when the HUSKY bypass is detected.
 *
 * @example
 * ```ts
 * import { checkHuskyBypass } from './guard';
 *
 * const warning = checkHuskyBypass();
 * if (warning) console.warn(warning.message);
 * ```
 *
 * @public
 * @since 0.2.0
 */
export function checkHuskyBypass(): GuardWarning | null {
  if (process.env.HUSKY === '0') {
    return {
      code: 'HUSKY_BYPASS',
      severity: 'error',
      message: 'HUSKY=0 is set — git hooks are disabled via environment variable',
      fix: 'unset HUSKY',
    };
  }

  return null;
}

/**
 * Verifies that installed hook scripts match the expected content.
 *
 * @remarks
 * This compares each hook file against what `generateHookScript` would produce.
 * Tampered hooks that still contain "versionguard" pass `areHooksInstalled` but
 * may have had critical lines removed or modified.
 *
 * @param config - VersionGuard configuration that defines which hooks should exist.
 * @param cwd - Repository directory to inspect.
 * @returns Guard warnings for each hook that has been tampered with.
 *
 * @example
 * ```ts
 * import { checkHookIntegrity } from './guard';
 *
 * const warnings = checkHookIntegrity(config, process.cwd());
 * for (const w of warnings) console.warn(w.code, w.message);
 * ```
 *
 * @public
 * @since 0.2.0
 */
export function checkHookIntegrity(config: VersionGuardConfig, cwd: string): GuardWarning[] {
  const warnings: GuardWarning[] = [];
  const gitDir = findGitDir(cwd);

  if (!gitDir) {
    return warnings;
  }

  const hooksDir = path.join(gitDir, 'hooks');

  for (const hookName of HOOK_NAMES) {
    if (!config.git.hooks[hookName]) {
      continue;
    }

    const hookPath = path.join(hooksDir, hookName);

    if (!fs.existsSync(hookPath)) {
      warnings.push({
        code: 'HOOK_MISSING',
        severity: 'error',
        message: `Required hook "${hookName}" is not installed`,
        fix: 'npx versionguard hooks install',
      });
      continue;
    }

    const actual = fs.readFileSync(hookPath, 'utf-8');
    const expected = generateHookScript(hookName);

    if (actual !== expected) {
      if (!actual.includes('versionguard')) {
        warnings.push({
          code: 'HOOK_REPLACED',
          severity: 'error',
          message: `Hook "${hookName}" has been replaced — versionguard invocation is missing`,
          fix: 'npx versionguard hooks install',
        });
      } else {
        warnings.push({
          code: 'HOOK_TAMPERED',
          severity: 'warning',
          message: `Hook "${hookName}" has been modified from the expected template`,
          fix: 'npx versionguard hooks install',
        });
      }
    }
  }

  return warnings;
}

/**
 * Checks whether hooks are configured as required but not enforced.
 *
 * @remarks
 * When hooks are enabled in the config but `enforceHooks` is false, validation
 * will not fail for missing hooks. In strict mode this is a policy gap.
 *
 * @param config - VersionGuard configuration to inspect.
 * @returns A guard warning when hooks are enabled but not enforced.
 *
 * @example
 * ```ts
 * import { checkEnforceHooksPolicy } from './guard';
 *
 * const warning = checkEnforceHooksPolicy(config);
 * if (warning) console.warn(warning.message);
 * ```
 *
 * @public
 * @since 0.2.0
 */
export function checkEnforceHooksPolicy(config: VersionGuardConfig): GuardWarning | null {
  const anyHookEnabled = HOOK_NAMES.some((name) => config.git.hooks[name]);

  if (anyHookEnabled && !config.git.enforceHooks) {
    return {
      code: 'HOOKS_NOT_ENFORCED',
      severity: 'warning',
      message:
        'Hooks are enabled but enforceHooks is false — missing hooks will not fail validation',
      fix: 'Set git.enforceHooks: true in .versionguard.yml',
    };
  }

  return null;
}

/**
 * Runs all guard checks and returns a consolidated report.
 *
 * @remarks
 * This is the primary entry point for strict mode. It runs every detection
 * check and returns a report indicating whether the repository is safe from
 * known bypass patterns.
 *
 * @param config - VersionGuard configuration.
 * @param cwd - Repository directory to inspect.
 * @returns A guard report with all findings.
 *
 * @example
 * ```ts
 * import { runGuardChecks } from './guard';
 *
 * const report = runGuardChecks(config, process.cwd());
 * if (!report.safe) console.error('Guard check failed:', report.warnings);
 * ```
 *
 * @public
 * @since 0.2.0
 */
export function runGuardChecks(config: VersionGuardConfig, cwd: string): GuardReport {
  const warnings: GuardWarning[] = [];

  const hooksPathWarning = checkHooksPathOverride(cwd);
  if (hooksPathWarning) {
    warnings.push(hooksPathWarning);
  }

  const huskyWarning = checkHuskyBypass();
  if (huskyWarning) {
    warnings.push(huskyWarning);
  }

  const integrityWarnings = checkHookIntegrity(config, cwd);
  warnings.push(...integrityWarnings);

  const enforceWarning = checkEnforceHooksPolicy(config);
  if (enforceWarning) {
    warnings.push(enforceWarning);
  }

  const hasErrors = warnings.some((w) => w.severity === 'error');

  return {
    safe: !hasErrors,
    warnings,
  };
}
