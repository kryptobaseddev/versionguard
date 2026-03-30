#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { Command } from 'commander';

const CLI_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_VERSION: string = (
  JSON.parse(fs.readFileSync(path.join(CLI_DIR, '..', 'package.json'), 'utf-8')) as {
    version: string;
  }
).version;

// Embedded at build time — no external files needed at runtime
import ckmRaw from '../docs/ckm.json?raw';
import llmsRaw from '../docs/llms.txt?raw';
import { createCkmEngine } from 'ckm-sdk';
import * as feedback from './feedback';
import * as fix from './fix';

const ckmEngine = createCkmEngine(JSON.parse(ckmRaw));

import * as versionguard from './index';
import { runHeadless, runWizard } from './init-wizard';
import { findProjectRoot, formatNotProjectError } from './project-root';
import * as tag from './tag';

const styles = {
  error: chalk.red,
  warning: chalk.yellow,
  success: chalk.green,
  info: chalk.blue,
  dim: chalk.gray,
  bold: chalk.bold,
};

/**
 * Resolves the effective project root, checking for project markers.
 * Exits with helpful guidance if not in a project directory.
 */
function requireProject(cwd: string, command: string): string {
  const result = findProjectRoot(cwd);
  if (!result.found) {
    console.error(styles.error(formatNotProjectError(cwd, command)));
    process.exit(1);
  }
  return result.root;
}

/**
 * Creates the VersionGuard CLI program definition.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This function wires all commands, options, and handlers onto a fresh Commander
 * program instance without parsing arguments yet.
 *
 * @returns A configured Commander program for the VersionGuard CLI.
 *
 * @example
 * ```typescript
 * const program = createProgram();
 * console.log(program.name());
 * ```
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('vg')
    .description('Strict versioning enforcement for SemVer and CalVer (alias: versionguard)')
    .version(CLI_VERSION);

  program
    .command('init')
    .description('Initialize VersionGuard configuration (interactive wizard or headless)')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .option('-t, --type <type>', 'Versioning type: semver or calver')
    .option('-f, --format <format>', 'CalVer format tokens (e.g., YYYY.M.MICRO)')
    .option('--allow-v-prefix', 'SemVer: allow v-prefix (e.g., v1.2.3)')
    .option('--no-build-metadata', 'SemVer: disallow +build metadata')
    .option('--require-prerelease', 'SemVer: require prerelease labels')
    .option('--manifest <source>', 'Manifest source (e.g., Cargo.toml, pyproject.toml, auto)')
    .option('--hooks', 'Install git hooks (default: true)')
    .option('--no-hooks', 'Skip git hooks')
    .option('--changelog', 'Enable changelog validation (default: true)')
    .option('--no-changelog', 'Disable changelog validation')
    .option('--github', 'Generate GitHub integration files (default: true)')
    .option('--no-github', 'Skip GitHub integration (dependabot.yml)')
    .option('-y, --yes', 'Accept all defaults, no prompts')
    .option('--force', 'Overwrite existing config file')
    .action(
      async (options: {
        cwd: string;
        type?: string;
        format?: string;
        allowVPrefix?: boolean;
        buildMetadata?: boolean;
        requirePrerelease?: boolean;
        manifest?: string;
        github?: boolean;
        hooks?: boolean;
        changelog?: boolean;
        yes?: boolean;
        force?: boolean;
      }) => {
        try {
          const isHeadless =
            options.yes ||
            options.type ||
            options.format ||
            options.manifest ||
            options.allowVPrefix ||
            options.buildMetadata === false ||
            options.requirePrerelease;

          let configPath: string | null;

          if (isHeadless) {
            // Headless mode: use flags, no prompts
            configPath = runHeadless({
              cwd: options.cwd,
              type: options.type as 'semver' | 'calver' | undefined,
              format: options.format,
              allowVPrefix: options.allowVPrefix,
              allowBuildMetadata: options.buildMetadata,
              requirePrerelease: options.requirePrerelease,
              manifest: options.manifest,
              github: options.github,
              hooks: options.hooks,
              changelog: options.changelog,
              yes: options.yes,
              force: options.force,
            });
            console.log(styles.success(`✓ Created ${path.relative(options.cwd, configPath)}`));
          } else {
            // Interactive wizard
            configPath = await runWizard(options.cwd);
            if (!configPath) {
              process.exit(0);
              return;
            }
          }

          // Auto-install hooks if enabled
          try {
            const config = versionguard.getConfig(options.cwd);
            if (config.git.enforceHooks) {
              versionguard.installHooks(config.git, options.cwd);
              console.log(styles.success('✓ Git hooks installed'));
            }
          } catch {
            console.log(styles.info('ℹ Skipped hooks install (not a git repository)'));
          }
        } catch (error) {
          console.error(styles.error(`✗ ${(error as Error).message}`));
          process.exit(1);
        }
      },
    );

  program
    .command('check')
    .description('Check the current version with actionable feedback')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .option('--prev <version>', 'Previous version for comparison')
    .option('--json', 'Print machine-readable JSON output')
    .action((options: { cwd: string; prev?: string; json?: boolean }) => {
      try {
        options.cwd = requireProject(options.cwd, 'check');
        const config = versionguard.getConfig(options.cwd);
        const version = versionguard.getPackageVersion(options.cwd, config.manifest);
        const result = feedback.getVersionFeedback(version, config, options.prev);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                version,
                versioningType: config.versioning.type,
                valid: result.valid,
                errors: result.errors,
                suggestions: result.suggestions,
              },
              null,
              2,
            ),
          );
          if (!result.valid) {
            process.exit(1);
          }
          return;
        }

        console.log(styles.bold(`Current version: ${version}`));
        console.log(styles.dim(`Versioning type: ${config.versioning.type}`));
        console.log('');

        if (result.valid) {
          console.log(styles.success('✓ Version is valid'));
          return;
        }

        console.log(styles.error('✗ Version has issues:'));
        console.log('');
        for (const error of result.errors) {
          console.log(styles.error(`  ✗ ${error.message}`));
        }
        if (result.suggestions.length > 0) {
          console.log('');
          console.log(styles.info('How to fix:'));
          for (const suggestion of result.suggestions) {
            console.log(`  → ${suggestion.message}`);
            if (suggestion.fix) {
              console.log(styles.dim(`    Run: ${suggestion.fix}`));
            }
          }
        }
        process.exit(1);
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('validate')
    .description('Run full validation with smart feedback')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .option('--hook <name>', 'Running as git hook')
    .option('--json', 'Print machine-readable JSON output')
    .action(async (options: { cwd: string; hook?: string; json?: boolean }) => {
      try {
        options.cwd = requireProject(options.cwd, 'validate');
        const config = versionguard.getConfig(options.cwd);

        // Route hook mode: pre-commit = lightweight, pre-push/post-tag = full
        const mode = options.hook === 'pre-commit' ? 'lightweight' : 'full';

        const version = versionguard.getPackageVersion(options.cwd, config.manifest);
        const result = await versionguard.validate(config, options.cwd, mode);

        let postTagResult: { success: boolean; message: string; actions: string[] } | undefined;

        if (options.hook === 'post-tag') {
          postTagResult = tag.handlePostTag(config, options.cwd);
        }

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                ...result,
                hook: options.hook ?? null,
                postTag: postTagResult ?? null,
              },
              null,
              2,
            ),
          );

          if (!result.valid || (postTagResult && !postTagResult.success)) {
            process.exit(1);
          }

          return;
        }

        console.log(styles.bold(`Validating version ${version}...`));
        console.log('');

        if (!result.syncValid) {
          console.log(styles.error('Sync Issues:'));
          for (const error of result.errors.filter((item) => item.includes('mismatch'))) {
            const parts = error.match(
              /Version mismatch in (.+):(\d+) - found "(.+?)" but expected "(.+?)"/,
            );
            if (!parts) {
              continue;
            }
            const suggestions = feedback.getSyncFeedback(parts[1], parts[3], parts[4]);
            console.log(styles.error(`  ✗ ${parts[1]} has wrong version`));
            console.log(styles.dim(`    Found: "${parts[3]}" Expected: "${parts[4]}"`));
            if (suggestions[0]?.fix) {
              console.log(styles.info(`    Fix: ${suggestions[0].fix}`));
            }
          }
          console.log('');
        }

        // Show scan findings (stale version literals)
        const scanErrors = result.errors.filter((item) => item.startsWith('Stale version'));
        if (scanErrors.length > 0) {
          console.log(styles.error('Scan Findings:'));
          for (const error of scanErrors) {
            const parts = error.match(
              /Stale version in (.+):(\d+) - found "(.+?)" but expected "(.+?)"/,
            );
            if (parts) {
              console.log(styles.error(`  ✗ ${parts[1]}:${parts[2]} has "${parts[3]}"`));
            }
          }
          console.log(
            styles.dim('  Hint: add entries to scan.allowlist to exclude intentional references'),
          );
          console.log('');
        }

        if (config.changelog.enabled && !result.changelogValid) {
          console.log(styles.error('Changelog Issues:'));
          for (const error of result.errors.filter((item) =>
            item.toLowerCase().includes('changelog'),
          )) {
            console.log(styles.error(`  ✗ ${error}`));
          }
          const suggestions = feedback.getChangelogFeedback(false, version);
          if (suggestions[0]?.fix) {
            console.log(styles.info(`Fix: ${suggestions[0].fix}`));
          }
          console.log('');
        }

        // Guard check results (now always in result when guard.enabled)
        if (result.guardReport && result.guardReport.warnings.length > 0) {
          console.log(styles.bold('Guard Checks:'));
          for (const warning of result.guardReport.warnings) {
            const icon = warning.severity === 'error' ? styles.error('✗') : styles.warning('⚠');
            console.log(`  ${icon} [${warning.code}] ${warning.message}`);
            if (warning.fix) {
              console.log(styles.dim(`    Fix: ${warning.fix}`));
            }
          }
          console.log('');
        }

        // Publish check results
        if (result.publishCheck) {
          if (result.publishCheck.published) {
            console.log(
              styles.info(
                `ℹ Version ${version} is already published on ${result.publishCheck.registry}`,
              ),
            );
          } else if (result.publishCheck.error) {
            console.log(styles.warning(`⚠ ${result.publishCheck.error}`));
          }
        }

        if (postTagResult) {
          if (!postTagResult.success) {
            console.log(styles.error(`✗ ${postTagResult.message}`));
            process.exit(1);
          }
        }

        if (!result.valid) {
          console.log(styles.error('✗ Validation failed'));
          process.exit(1);
        }

        console.log(styles.success('✓ All validations passed'));
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('doctor')
    .description('Report repository readiness in one pass')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .option('--json', 'Print machine-readable JSON output')
    .action(async (options: { cwd: string; json?: boolean }) => {
      try {
        options.cwd = requireProject(options.cwd, 'doctor');
        const config = versionguard.getConfig(options.cwd);
        const report = await versionguard.doctor(config, options.cwd);

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          if (!report.ready) {
            process.exit(1);
          }
          return;
        }

        console.log(styles.bold('VersionGuard Doctor'));
        console.log(`  Version: ${report.version || '(missing)'}`);
        console.log(`  Version valid: ${report.versionValid ? 'yes' : 'no'}`);
        console.log(`  Files in sync: ${report.syncValid ? 'yes' : 'no'}`);
        console.log(`  Changelog ready: ${report.changelogValid ? 'yes' : 'no'}`);
        console.log(`  Scan clean: ${report.scanValid ? 'yes' : 'no'}`);
        console.log(`  Guard safe: ${report.guardValid ? 'yes' : 'no'}`);
        console.log(`  Publish ready: ${report.publishValid ? 'yes' : 'no'}`);
        console.log(`  Git repository: ${report.gitRepository ? 'yes' : 'no'}`);
        console.log(
          `  Hooks installed: ${report.gitRepository ? (report.hooksInstalled ? 'yes' : 'no') : 'n/a'}`,
        );
        console.log(
          `  Worktree clean: ${report.gitRepository ? (report.worktreeClean ? 'yes' : 'no') : 'n/a'}`,
        );

        if (!report.ready) {
          console.log('');
          console.log(styles.error('Issues:'));
          for (const error of report.errors) {
            console.log(styles.error(`  ✗ ${error}`));
          }
          process.exit(1);
        }

        console.log('');
        console.log(styles.success('✓ Repository is ready'));
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('fix')
    .description('Auto-fix detected issues')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .action((options: { cwd: string }) => {
      try {
        options.cwd = requireProject(options.cwd, 'fix');
        const config = versionguard.getConfig(options.cwd);
        const version = versionguard.getPackageVersion(options.cwd, config.manifest);
        const results = fix.fixAll(config, version, options.cwd);

        console.log(styles.bold(`Fixing issues for version ${version}...`));
        console.log('');

        for (const result of results) {
          const printer = result.fixed ? styles.success : styles.dim;
          console.log(printer(`${result.fixed ? '✓' : '•'} ${result.message}`));
        }
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('fix-changelog')
    .description('Fix Changesets-mangled changelog into Keep a Changelog format')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .action((options: { cwd: string }) => {
      try {
        options.cwd = requireProject(options.cwd, 'fix-changelog');
        const config = versionguard.getConfig(options.cwd);
        const changelogPath = path.join(options.cwd, config.changelog.file);

        if (!versionguard.isChangesetMangled(changelogPath)) {
          console.log(styles.dim('• Changelog is not mangled — no fix needed'));
          return;
        }

        const fixed = versionguard.fixChangesetMangling(changelogPath);
        if (fixed) {
          console.log(
            styles.success(`✓ Restructured ${config.changelog.file} to Keep a Changelog format`),
          );
        } else {
          console.log(styles.dim('• Could not auto-fix changelog structure'));
        }
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('sync')
    .description('Sync version to all configured files')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .action((options: { cwd: string }) => {
      try {
        options.cwd = requireProject(options.cwd, 'sync');
        const config = versionguard.getConfig(options.cwd);
        const version = versionguard.getPackageVersion(options.cwd, config.manifest);
        const results = fix.fixSyncIssues(config, options.cwd);

        console.log(styles.bold(`Syncing version ${version}...`));
        for (const result of results) {
          const printer = result.fixed ? styles.success : styles.dim;
          console.log(printer(`${result.fixed ? '✓' : '•'} ${result.message}`));
        }
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('bump')
    .description('Suggest the next version based on current version and scheme')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .option('-t, --type <type>', 'Bump type (major, minor, patch, auto)')
    .action((options: { cwd: string; type?: 'major' | 'minor' | 'patch' | 'auto' }) => {
      try {
        options.cwd = requireProject(options.cwd, 'bump');
        const config = versionguard.getConfig(options.cwd);
        const currentVersion = versionguard.getPackageVersion(options.cwd, config.manifest);
        const suggestions = fix.suggestNextVersion(currentVersion, config, options.type);

        console.log(styles.bold(`Current version: ${currentVersion}`));
        console.log('');
        for (const [index, suggestion] of suggestions.entries()) {
          console.log(`  ${index + 1}. ${styles.bold(suggestion.version)}`);
          console.log(`     ${styles.dim(suggestion.reason)}`);
        }

        console.log('');
        console.log(styles.dim('Use Changesets or your release tool to apply a version bump.'));
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('tag')
    .description('Create a git tag with automation')
    .argument('[version]', 'Version to tag (defaults to manifest version)')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .option('-m, --message <msg>', 'Tag message')
    .option('--no-fix', 'Skip auto-fixing files before tagging')
    .action(
      (version: string | undefined, options: { cwd: string; message?: string; fix?: boolean }) => {
        try {
          options.cwd = requireProject(options.cwd, 'tag');
          const config = versionguard.getConfig(options.cwd);
          const tagVersion =
            version || versionguard.getPackageVersion(options.cwd, config.manifest);
          const result = tag.createTag(
            tagVersion,
            options.message,
            options.fix !== false,
            config,
            options.cwd,
          );

          if (!result.success) {
            console.log(styles.error(`✗ ${result.message}`));
            process.exit(1);
          }

          console.log(styles.success(`✓ ${result.message}`));
          for (const action of result.actions) {
            console.log(`  • ${action}`);
          }
        } catch (error) {
          console.error(styles.error(`✗ ${(error as Error).message}`));
          process.exit(1);
        }
      },
    );

  program
    .command('ckm [topic]')
    .description('Codebase Knowledge Manifest — auto-generated docs and help')
    .option('--json', 'Machine-readable CKM output for LLM agents')
    .option('--llm', 'Full API context (forge-ts llms.txt)')
    .action((topic: string | undefined, options: { json?: boolean; llm?: boolean }) => {
      if (options.llm) {
        console.log(llmsRaw);
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(ckmEngine.getTopicJson(topic), null, 2));
        return;
      }

      if (topic) {
        const content = ckmEngine.getTopicContent(topic);
        if (!content) {
          console.error(styles.error(`Unknown topic: ${topic}`));
          console.log('');
          console.log(ckmEngine.getTopicIndex('vg'));
          process.exit(1);
        }
        console.log(content);
      } else {
        console.log(ckmEngine.getTopicIndex('vg'));
      }
    });

  const hooksCommand = program.command('hooks').description('Manage git hooks');

  hooksCommand
    .command('install')
    .description('Install git hooks')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .action((options: { cwd: string }) => {
      try {
        options.cwd = requireProject(options.cwd, 'hooks install');
        const config = versionguard.getConfig(options.cwd);
        versionguard.installHooks(config.git, options.cwd);
        console.log(styles.success('✓ Git hooks installed'));
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  hooksCommand
    .command('uninstall')
    .description('Uninstall git hooks')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .action((options: { cwd: string }) => {
      try {
        options.cwd = requireProject(options.cwd, 'hooks uninstall');
        versionguard.uninstallHooks(options.cwd);
        console.log(styles.success('✓ Git hooks uninstalled'));
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  hooksCommand
    .command('status')
    .description('Check if hooks are installed')
    .option('-c, --cwd <path>', 'Working directory', process.cwd())
    .action((options: { cwd: string }) => {
      try {
        options.cwd = requireProject(options.cwd, 'hooks status');
        if (versionguard.areHooksInstalled(options.cwd)) {
          console.log(styles.success('✓ VersionGuard hooks are installed'));
          return;
        }

        console.log(styles.warning('✗ VersionGuard hooks are not installed'));
        process.exit(1);
      } catch (error) {
        console.error(styles.error(`✗ ${(error as Error).message}`));
        process.exit(1);
      }
    });

  return program;
}

/**
 * Parses CLI arguments and executes the matching command.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper delegates argument parsing to the Commander program created by
 * {@link createProgram}. It resolves when the selected command finishes.
 *
 * @param argv - Full argument vector to parse.
 * @see {@link createProgram}
 *
 * @example
 * ```typescript
 * const argv = ['node', 'versionguard', 'check'];
 * await runCli(argv);
 * ```
 */
export async function runCli(argv: string[] = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

/**
 * Determines whether the current module is the invoked CLI entry point.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This helper compares the resolved script path from `argv` with the current
 * module URL so the CLI runs only during direct execution.
 *
 * @param argv - Full process argument vector.
 * @param metaUrl - Module URL to compare against the invoked entry path.
 * @returns `true` when the current module should launch the CLI.
 *
 * @example
 * ```typescript
 * const shouldRun = shouldRunCli(process.argv, import.meta.url);
 * console.log(shouldRun);
 * ```
 */
export function shouldRunCli(
  argv: string[] = process.argv,
  metaUrl: string = import.meta.url,
): boolean {
  if (!argv[1]) return false;
  const metaPath = fileURLToPath(metaUrl);
  const resolved = path.resolve(argv[1]);
  // Try resolving through symlinks first (needed for global npm installs)
  try {
    return fs.realpathSync(resolved) === metaPath;
  } catch {
    // File may not exist in test contexts — fall back to direct comparison
    return resolved === metaPath;
  }
}

/* v8 ignore start -- exercised only by direct CLI execution */
if (shouldRunCli()) {
  void runCli();
}
/* v8 ignore stop */
