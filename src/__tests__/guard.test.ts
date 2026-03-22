import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '../config';
import {
  checkEnforceHooksPolicy,
  checkHookIntegrity,
  checkHooksPathOverride,
  checkHuskyBypass,
  runGuardChecks,
} from '../guard';
import { generateHookScript, installHooks } from '../hooks';
import { createTempProject, initGitRepo } from './test-utils';

describe('guard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.HUSKY;
  });

  describe('checkHooksPathOverride', () => {
    it('returns null when core.hooksPath is not set', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);

      expect(checkHooksPathOverride(cwd)).toBeNull();
    });

    it('detects core.hooksPath override', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      // Safe: hardcoded test fixture, no user input
      execSync('git config core.hooksPath /tmp/fake-hooks', { cwd, stdio: 'ignore' });

      const result = checkHooksPathOverride(cwd);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('HOOKS_PATH_OVERRIDE');
      expect(result?.severity).toBe('error');
      expect(result?.message).toContain('/tmp/fake-hooks');
      expect(result?.fix).toBe('git config --unset core.hooksPath');
    });
  });

  describe('checkHuskyBypass', () => {
    it('returns null when HUSKY is not set', () => {
      delete process.env.HUSKY;
      expect(checkHuskyBypass()).toBeNull();
    });

    it('detects HUSKY=0 bypass', () => {
      process.env.HUSKY = '0';
      const result = checkHuskyBypass();
      expect(result).not.toBeNull();
      expect(result?.code).toBe('HUSKY_BYPASS');
      expect(result?.severity).toBe('error');
    });

    it('ignores HUSKY set to other values', () => {
      process.env.HUSKY = '1';
      expect(checkHuskyBypass()).toBeNull();
    });
  });

  describe('checkHookIntegrity', () => {
    it('returns empty when hooks are not configured', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();
      config.git.hooks['pre-commit'] = false;
      config.git.hooks['pre-push'] = false;
      config.git.hooks['post-tag'] = false;

      expect(checkHookIntegrity(config, cwd)).toEqual([]);
    });

    it('reports missing hooks', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();

      const warnings = checkHookIntegrity(config, cwd);
      expect(warnings.length).toBe(3);
      expect(warnings.every((w) => w.code === 'HOOK_MISSING')).toBe(true);
      expect(warnings.every((w) => w.severity === 'error')).toBe(true);
    });

    it('returns empty when hooks match expected template', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();
      installHooks(config.git, cwd);

      expect(checkHookIntegrity(config, cwd)).toEqual([]);
    });

    it('detects replaced hooks without versionguard', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();
      installHooks(config.git, cwd);

      const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
      fs.writeFileSync(hookPath, '#!/bin/sh\nexit 0\n', { mode: 0o755 });

      const warnings = checkHookIntegrity(config, cwd);
      const replaced = warnings.find((w) => w.code === 'HOOK_REPLACED');
      expect(replaced).toBeDefined();
      expect(replaced?.severity).toBe('error');
    });

    it('detects tampered hooks that still contain versionguard', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();
      installHooks(config.git, cwd);

      const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
      const original = generateHookScript('pre-commit');
      fs.writeFileSync(hookPath, `${original}\necho "extra line"`, { mode: 0o755 });

      const warnings = checkHookIntegrity(config, cwd);
      const tampered = warnings.find((w) => w.code === 'HOOK_TAMPERED');
      expect(tampered).toBeDefined();
      expect(tampered?.severity).toBe('warning');
    });
  });

  describe('checkEnforceHooksPolicy', () => {
    it('returns null when enforceHooks is true', () => {
      const config = getDefaultConfig();
      config.git.enforceHooks = true;

      expect(checkEnforceHooksPolicy(config)).toBeNull();
    });

    it('returns null when no hooks are enabled', () => {
      const config = getDefaultConfig();
      config.git.hooks['pre-commit'] = false;
      config.git.hooks['pre-push'] = false;
      config.git.hooks['post-tag'] = false;
      config.git.enforceHooks = false;

      expect(checkEnforceHooksPolicy(config)).toBeNull();
    });

    it('warns when hooks are enabled but not enforced', () => {
      const config = getDefaultConfig();
      config.git.enforceHooks = false;

      const result = checkEnforceHooksPolicy(config);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('HOOKS_NOT_ENFORCED');
      expect(result?.severity).toBe('warning');
    });
  });

  describe('runGuardChecks', () => {
    it('reports safe when everything is correct', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();
      installHooks(config.git, cwd);

      const report = runGuardChecks(config, cwd);
      expect(report.safe).toBe(true);
      expect(report.warnings.length).toBe(0);
    });

    it('reports unsafe when hooks are missing', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();

      const report = runGuardChecks(config, cwd);
      expect(report.safe).toBe(false);
      expect(report.warnings.some((w) => w.code === 'HOOK_MISSING')).toBe(true);
    });

    it('aggregates multiple findings', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();
      config.git.enforceHooks = false;

      process.env.HUSKY = '0';
      const report = runGuardChecks(config, cwd);

      expect(report.safe).toBe(false);
      expect(report.warnings.some((w) => w.code === 'HUSKY_BYPASS')).toBe(true);
      expect(report.warnings.some((w) => w.code === 'HOOK_MISSING')).toBe(true);
      expect(report.warnings.some((w) => w.code === 'HOOKS_NOT_ENFORCED')).toBe(true);
    });

    it('safe is true when only warnings exist', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      const config = getDefaultConfig();
      config.git.enforceHooks = false;
      installHooks(config.git, cwd);

      const report = runGuardChecks(config, cwd);
      expect(report.safe).toBe(true);
      expect(report.warnings.length).toBe(1);
      expect(report.warnings[0].code).toBe('HOOKS_NOT_ENFORCED');
    });
  });
});
