/**
 * Public API for VersionGuard.
 *
 * @packageDocumentation
 * @public
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';

import * as calver from './calver';
import { validateChangelog } from './changelog';
import { dependabotConfigExists } from './github';
import { runGuardChecks } from './guard';
import { areHooksInstalled, findGitDir } from './hooks';
import { getPackageVersion } from './project';
import { checkPublishStatus, readPackageName } from './publish';
import * as semver from './semver';
import { detectManifests } from './sources/resolve';
import { checkHardcodedVersions, scanRepoForVersions, syncVersion } from './sync';
import {
  type DoctorReport,
  type FullValidationResult,
  type GuardReport,
  getCalVerConfig,
  getSemVerConfig,
  type PublishCheckResult,
  type ValidateMode,
  type ValidationResult,
  type VersionGuardConfig,
} from './types';

export * as calver from './calver';
export {
  type ChangelogStructureOptions,
  fixChangesetMangling,
  isChangesetMangled,
  validateChangelog,
} from './changelog';
export { type CkmEngine, createCkmEngine } from './ckm';
export { getConfig, initConfig } from './config';
export * from './feedback';
export * from './fix';
export * from './github';
export * from './guard';
export { areHooksInstalled, installHooks, uninstallHooks } from './hooks';
export { getPackageVersion, getVersionSource } from './project';
export { findProjectRoot, formatNotProjectError } from './project-root';
export { checkPublishStatus, REGISTRY_TABLE, readPackageName } from './publish';
export * as semver from './semver';
export * from './sources';
export { checkHardcodedVersions, scanRepoForVersions, syncVersion } from './sync';
export * from './tag';
export * from './types';

/**
 * Validates a version string against the active versioning strategy.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper dispatches to SemVer or CalVer validation based on
 * `config.versioning.type`.
 *
 * @param version - Version string to validate.
 * @param config - VersionGuard configuration that selects the validation rules.
 * @returns The validation result for the provided version.
 * @example
 * ```ts
 * import { getDefaultConfig, validateVersion } from 'versionguard';
 *
 * const result = validateVersion('1.2.3', getDefaultConfig());
 * ```
 */
export function validateVersion(version: string, config: VersionGuardConfig): ValidationResult {
  if (config.versioning.type === 'semver') {
    return semver.validate(version, getSemVerConfig(config), config.versioning.schemeRules);
  }

  const calverConfig = getCalVerConfig(config);
  return calver.validate(
    version,
    calverConfig.format,
    calverConfig.preventFutureDates,
    config.versioning.schemeRules,
  );
}

/**
 * Validates the current project state against the supplied configuration.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Runs version, sync, changelog, scan, guard, and publish checks based on
 * the validation mode. Full mode (default) runs all checks. Lightweight
 * mode (for pre-commit hooks) runs only version + sync.
 *
 * @param config - VersionGuard configuration to apply.
 * @param cwd - Project directory to inspect.
 * @param mode - Validation mode: 'full' (default) or 'lightweight'.
 * @returns A full validation report for the project rooted at `cwd`.
 * @example
 * ```ts
 * import { getDefaultConfig, validate } from 'versionguard';
 *
 * const result = await validate(getDefaultConfig(), process.cwd());
 * ```
 */
export async function validate(
  config: VersionGuardConfig,
  cwd: string = process.cwd(),
  mode: ValidateMode = 'full',
): Promise<FullValidationResult> {
  const errors: string[] = [];

  let version: string;
  try {
    version = getPackageVersion(cwd, config.manifest);
  } catch (err) {
    return {
      valid: false,
      version: '',
      versionValid: false,
      syncValid: false,
      changelogValid: false,
      scanValid: true,
      guardValid: true,
      publishValid: true,
      errors: [(err as Error).message],
    };
  }

  const versionResult = validateVersion(version, config);
  if (!versionResult.valid) {
    errors.push(...versionResult.errors.map((error) => error.message));
  }

  const hardcoded = checkHardcodedVersions(version, config.sync, config.ignore, cwd);

  if (hardcoded.length > 0) {
    for (const mismatch of hardcoded) {
      errors.push(
        `Version mismatch in ${mismatch.file}:${mismatch.line} - found "${mismatch.found}" but expected "${version}"`,
      );
    }
  }

  // Lightweight mode: version + sync only (fast path for pre-commit hooks)
  if (mode === 'lightweight') {
    return {
      valid: errors.length === 0,
      version,
      versionValid: versionResult.valid,
      syncValid: hardcoded.length === 0,
      changelogValid: true,
      scanValid: true,
      guardValid: true,
      publishValid: true,
      errors,
    };
  }

  // --- Full mode: all checks ---

  // Changelog validation
  let changelogValid = true;
  if (config.changelog.enabled) {
    const changelogPath = path.join(cwd, config.changelog.file);
    const changelogResult = validateChangelog(
      changelogPath,
      version,
      config.changelog.strict,
      config.changelog.requireEntry,
      {
        enforceStructure: config.changelog.enforceStructure,
        sections: config.changelog.sections,
      },
    );

    if (!changelogResult.valid) {
      changelogValid = false;
      errors.push(...changelogResult.errors);
    }
  }

  // Repo-wide scan for stale version literals
  let scanValid = true;
  if (config.scan?.enabled) {
    const scanFindings = scanRepoForVersions(version, config.scan, config.ignore, cwd);
    if (scanFindings.length > 0) {
      scanValid = false;
      for (const finding of scanFindings) {
        errors.push(
          `Stale version in ${finding.file}:${finding.line} - found "${finding.found}" but expected "${version}"`,
        );
      }
    }
  }

  // Guard checks (hook bypass detection)
  let guardValid = true;
  let guardReport: GuardReport | undefined;
  if (config.guard?.enabled) {
    guardReport = runGuardChecks(config, cwd);
    if (!guardReport.safe) {
      guardValid = false;
      for (const warning of guardReport.warnings) {
        if (warning.severity === 'error') {
          errors.push(`[${warning.code}] ${warning.message}`);
        }
      }
    }
  }

  // Publish check (registry status verification)
  const publishValid = true;
  let publishCheck: PublishCheckResult | undefined;
  if (config.publish?.enabled) {
    const manifestSource =
      config.manifest.source !== 'auto'
        ? config.manifest.source
        : (detectManifests(cwd)[0] ?? null);
    if (manifestSource) {
      const packageName = readPackageName(manifestSource, cwd);
      if (packageName) {
        publishCheck = await checkPublishStatus(
          manifestSource,
          packageName,
          version,
          config.publish,
        );
        // Network/timeout errors are informational, not failures (fail-open)
        if (publishCheck.error) {
          errors.push(`Publish check warning: ${publishCheck.error}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    version,
    versionValid: versionResult.valid,
    syncValid: hardcoded.length === 0,
    changelogValid,
    scanValid,
    guardValid,
    publishValid,
    publishCheck,
    guardReport,
    errors,
  };
}

/**
 * Runs an extended readiness check for a project.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * In addition to `validate`, this inspects Git state so callers can determine
 * whether hooks are installed and the worktree is clean.
 *
 * @param config - VersionGuard configuration to apply.
 * @param cwd - Project directory to inspect.
 * @returns A readiness report that includes validation and Git diagnostics.
 * @example
 * ```ts
 * import { doctor, getDefaultConfig } from 'versionguard';
 *
 * const report = doctor(getDefaultConfig(), process.cwd());
 * ```
 */
export async function doctor(
  config: VersionGuardConfig,
  cwd: string = process.cwd(),
): Promise<DoctorReport> {
  const validation = await validate(config, cwd);
  const gitRepository = findGitDir(cwd) !== null;
  const hooksInstalled = gitRepository ? areHooksInstalled(cwd) : false;
  const worktreeClean = gitRepository ? isWorktreeClean(cwd) : true;
  const errors = [...validation.errors];

  if (gitRepository && config.git.enforceHooks && !hooksInstalled) {
    errors.push('Git hooks are not installed');
  }

  if (gitRepository && !worktreeClean) {
    errors.push('Working tree is not clean');
  }

  if (gitRepository && config.github?.dependabot && !dependabotConfigExists(cwd)) {
    errors.push('.github/dependabot.yml is missing — run `vg init` to generate it');
  }

  return {
    ready: errors.length === 0,
    version: validation.version,
    versionValid: validation.versionValid,
    syncValid: validation.syncValid,
    changelogValid: validation.changelogValid,
    scanValid: validation.scanValid,
    guardValid: validation.guardValid,
    publishValid: validation.publishValid,
    gitRepository,
    hooksInstalled,
    worktreeClean,
    errors,
  };
}

/**
 * Synchronizes configured files to the current package version.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This reads the version from `package.json` and rewrites configured files
 * using the sync patterns defined in the VersionGuard config.
 *
 * @param config - VersionGuard configuration containing sync rules.
 * @param cwd - Project directory whose files should be synchronized.
 * @example
 * ```ts
 * import { getDefaultConfig, sync } from 'versionguard';
 *
 * sync(getDefaultConfig(), process.cwd());
 * ```
 */
export function sync(config: VersionGuardConfig, cwd: string = process.cwd()): void {
  const version = getPackageVersion(cwd, config.manifest);
  syncVersion(version, config.sync, cwd);
}

/**
 * Determines whether a project can move from one version to another.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Both the current and proposed versions must validate against the configured
 * versioning scheme, and the new version must compare greater than the current
 * version.
 *
 * @param currentVersion - Version currently in use.
 * @param newVersion - Proposed next version.
 * @param config - VersionGuard configuration that defines version rules.
 * @returns An object indicating whether the bump is allowed and why it failed.
 * @example
 * ```ts
 * import { canBump, getDefaultConfig } from 'versionguard';
 *
 * const result = canBump('1.2.3', '1.3.0', getDefaultConfig());
 * ```
 */
export function canBump(
  currentVersion: string,
  newVersion: string,
  config: VersionGuardConfig,
): { canBump: boolean; error?: string } {
  const currentValid = validateVersion(currentVersion, config);
  const newValid = validateVersion(newVersion, config);

  if (!currentValid.valid) {
    return { canBump: false, error: `Current version is invalid: ${currentVersion}` };
  }

  if (!newValid.valid) {
    return { canBump: false, error: `New version is invalid: ${newVersion}` };
  }

  if (config.versioning.type === 'semver') {
    if (!semver.gt(newVersion, currentVersion)) {
      return {
        canBump: false,
        error: `New version ${newVersion} must be greater than current ${currentVersion}`,
      };
    }
  } else {
    const calverConfig = getCalVerConfig(config);
    const currentParsed = calver.parse(currentVersion, calverConfig.format);
    const newParsed = calver.parse(newVersion, calverConfig.format);

    if (!currentParsed || !newParsed) {
      return { canBump: false, error: 'Failed to parse CalVer versions' };
    }

    if (calver.compare(newVersion, currentVersion, calverConfig.format) <= 0) {
      return {
        canBump: false,
        error: `New CalVer ${newVersion} must be newer than current ${currentVersion}`,
      };
    }
  }

  return { canBump: true };
}

function isWorktreeClean(cwd: string): boolean {
  try {
    return execSync('git status --porcelain', { cwd, encoding: 'utf-8' }).trim().length === 0;
  } catch {
    return false;
  }
}
