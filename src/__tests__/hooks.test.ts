import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getDefaultConfig } from '../config';
import {
  areHooksInstalled,
  findGitDir,
  generateHookScript,
  installHooks,
  uninstallHooks,
} from '../hooks';
import { createTempProject, initGitRepo, writeTextFile } from './test-utils';

describe('hooks', () => {
  it('installs and uninstalls managed git hooks', () => {
    const cwd = createTempProject();
    initGitRepo(cwd);

    installHooks(getDefaultConfig().git, cwd);
    expect(areHooksInstalled(cwd)).toBe(true);
    expect(fs.readFileSync(path.join(cwd, '.git/hooks/pre-commit'), 'utf-8')).toContain(
      'versionguard',
    );
    expect(fs.readFileSync(path.join(cwd, '.git/hooks/pre-push'), 'utf-8')).toContain(
      'versionguard',
    );
    expect(fs.readFileSync(path.join(cwd, '.git/hooks/post-tag'), 'utf-8')).toContain(
      'versionguard',
    );

    uninstallHooks(cwd);
    expect(fs.existsSync(path.join(cwd, '.git/hooks/pre-commit'))).toBe(false);
  });

  it('installs only enabled hooks and preserves unrelated hook files', () => {
    const cwd = createTempProject();
    initGitRepo(cwd);
    const hookPath = writeTextFile(cwd, '.git/hooks/pre-push', '#!/bin/sh\necho custom\n');

    installHooks(
      {
        ...getDefaultConfig().git,
        hooks: {
          'pre-commit': true,
          'pre-push': false,
          'post-tag': false,
        },
      },
      cwd,
    );

    expect(fs.existsSync(path.join(cwd, '.git/hooks/pre-commit'))).toBe(true);
    expect(fs.existsSync(path.join(cwd, '.git/hooks/post-tag'))).toBe(false);
    expect(fs.readFileSync(hookPath, 'utf-8')).toContain('custom');
    expect(areHooksInstalled(cwd)).toBe(false);
  });

  it('finds the git directory from nested paths and returns null outside repos', () => {
    const cwd = createTempProject();
    initGitRepo(cwd);
    const nested = path.join(cwd, 'packages', 'tool');
    fs.mkdirSync(nested, { recursive: true });
    const nonRepo = createTempProject();

    expect(findGitDir(nested)).toBe(path.join(cwd, '.git'));
    expect(findGitDir(nonRepo)).toBeNull();
    expect(areHooksInstalled(nonRepo)).toBe(false);
  });

  it('throws when installing hooks outside a git repo', () => {
    const cwd = createTempProject();

    expect(() => installHooks(getDefaultConfig().git, cwd)).toThrow(
      'Not a git repository. Run `git init` first.',
    );
  });

  it('uninstalls only versionguard-managed hooks and no-ops outside git repos', () => {
    const cwd = createTempProject();
    initGitRepo(cwd);
    writeTextFile(cwd, '.git/hooks/pre-commit', generateHookScript('pre-commit'));
    const customHook = writeTextFile(cwd, '.git/hooks/pre-push', '#!/bin/sh\necho keep\n');

    uninstallHooks(cwd);

    expect(fs.existsSync(path.join(cwd, '.git/hooks/pre-commit'))).toBe(false);
    expect(fs.readFileSync(customHook, 'utf-8')).toContain('keep');
    expect(() => uninstallHooks(createTempProject())).not.toThrow();
  });
});
