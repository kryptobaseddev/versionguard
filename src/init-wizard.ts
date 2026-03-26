/**
 * Interactive setup wizard and headless init for VersionGuard.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import * as p from '@clack/prompts';
import * as yaml from 'js-yaml';

import { isValidCalVerFormat } from './calver';
import type { VersionGuardConfig } from './types';

/**
 * Options for headless (non-interactive) initialization.
 *
 * @public
 * @since 0.3.0
 */
export interface InitOptions {
  cwd: string;
  type?: 'semver' | 'calver';
  format?: string;
  manifest?: string;
  hooks?: boolean;
  changelog?: boolean;
  yes?: boolean;
  force?: boolean;
}

/**
 * Runs the interactive setup wizard.
 *
 * @remarks
 * Walks the user through versioning type, CalVer format, manifest source,
 * git hooks, and changelog configuration. Writes `.versionguard.yml` when done.
 *
 * @param cwd - Project directory to initialize.
 * @returns The path to the created config file, or `null` if cancelled.
 *
 * @public
 * @since 0.3.0
 */
export async function runWizard(cwd: string): Promise<string | null> {
  p.intro('VersionGuard Setup');

  const existingConfig = findExistingConfig(cwd);
  if (existingConfig) {
    p.log.warning(`Config already exists: ${path.relative(cwd, existingConfig)}`);
    const overwrite = await p.confirm({ message: 'Overwrite existing config?' });
    if (p.isCancel(overwrite) || !overwrite) {
      p.outro('Setup cancelled.');
      return null;
    }
  }

  // Step 1: Versioning type
  const type = await p.select({
    message: 'Versioning strategy',
    options: [
      { value: 'semver', label: 'SemVer', hint: 'MAJOR.MINOR.PATCH (e.g., 1.2.3)' },
      { value: 'calver', label: 'CalVer', hint: 'Calendar-based (e.g., 2026.3.0)' },
    ],
  });
  if (p.isCancel(type)) {
    p.outro('Setup cancelled.');
    return null;
  }

  // Step 2: CalVer format (if calver)
  let format: string | undefined;
  if (type === 'calver') {
    const selected = await selectCalVerFormat();
    if (!selected) {
      p.outro('Setup cancelled.');
      return null;
    }
    format = selected;
  }

  // Step 3: Manifest source
  const manifest = await selectManifest(cwd);
  if (manifest === null) {
    p.outro('Setup cancelled.');
    return null;
  }

  // Step 4: Git hooks
  const hooks = await p.confirm({
    message: 'Install git hooks? (pre-commit, pre-push, post-tag)',
    initialValue: true,
  });
  if (p.isCancel(hooks)) {
    p.outro('Setup cancelled.');
    return null;
  }

  // Step 5: Changelog
  const changelog = await p.confirm({
    message: 'Enable changelog validation?',
    initialValue: true,
  });
  if (p.isCancel(changelog)) {
    p.outro('Setup cancelled.');
    return null;
  }

  // Build and write config
  const config = buildConfig({
    type: type,
    format,
    manifest: manifest === 'auto' ? undefined : manifest,
    hooks: hooks,
    changelog: changelog,
  });

  const configPath = writeConfig(cwd, config);

  p.log.success(`Created ${path.relative(cwd, configPath)}`);
  p.outro('Run `versionguard validate` to verify your setup.');

  return configPath;
}

/**
 * Initializes VersionGuard non-interactively using CLI flags.
 *
 * @remarks
 * When `--yes` is passed, all defaults are used without prompting.
 * Individual flags override specific defaults.
 *
 * @param options - Headless initialization options.
 * @returns The path to the created config file.
 *
 * @public
 * @since 0.3.0
 */
export function runHeadless(options: InitOptions): string {
  const existingConfig = findExistingConfig(options.cwd);
  if (existingConfig && !options.force && !options.yes) {
    throw new Error(
      `Config already exists: ${existingConfig}. Use --force to overwrite or --yes to accept defaults.`,
    );
  }

  const config = buildConfig({
    type: options.type ?? 'semver',
    format: options.format,
    manifest: options.manifest,
    hooks: options.hooks ?? true,
    changelog: options.changelog ?? true,
  });

  return writeConfig(options.cwd, config);
}

async function selectCalVerFormat(): Promise<string | null> {
  const preset = await p.select({
    message: 'CalVer format',
    options: [
      { value: 'YYYY.M.MICRO', label: 'YYYY.M.MICRO', hint: 'calver.org standard — 2026.3.0' },
      { value: 'YYYY.MM.MICRO', label: 'YYYY.MM.MICRO', hint: 'padded month — 2026.03.0' },
      { value: 'YY.0M.MICRO', label: 'YY.0M.MICRO', hint: 'Twisted/pip style — 26.03.0' },
      { value: 'YYYY.0M.0D', label: 'YYYY.0M.0D', hint: 'date-based — 2026.03.25' },
      {
        value: 'YYYY.0M.0D.MICRO',
        label: 'YYYY.0M.0D.MICRO',
        hint: 'youtube-dl style — 2026.03.25.0',
      },
      { value: 'YY.0M', label: 'YY.0M', hint: 'Ubuntu style — 26.03' },
      { value: 'custom', label: 'Custom...', hint: 'enter your own token format' },
    ],
  });
  if (p.isCancel(preset)) return null;

  if (preset === 'custom') {
    const custom = await p.text({
      message: 'Enter CalVer format (dot-separated tokens)',
      placeholder: 'YYYY.MM.MICRO',
      validate(value: string | undefined) {
        if (!value || !isValidCalVerFormat(value)) {
          return 'Invalid format. Use tokens: YYYY|YY|0Y, MM|M|0M, WW|0W, DD|D|0D, MICRO|PATCH';
        }
      },
    });
    if (p.isCancel(custom)) return null;
    return custom;
  }

  return preset as string;
}

async function selectManifest(cwd: string): Promise<string | null> {
  // Detect what exists
  const detected: { value: string; label: string; hint?: string }[] = [];
  const checks = [
    { file: 'package.json', label: 'package.json', hint: 'Node.js / Bun' },
    { file: 'Cargo.toml', label: 'Cargo.toml', hint: 'Rust' },
    { file: 'pyproject.toml', label: 'pyproject.toml', hint: 'Python' },
    { file: 'pubspec.yaml', label: 'pubspec.yaml', hint: 'Dart / Flutter' },
    { file: 'composer.json', label: 'composer.json', hint: 'PHP' },
    { file: 'pom.xml', label: 'pom.xml', hint: 'Java / Maven' },
    { file: 'VERSION', label: 'VERSION', hint: 'Plain text file' },
  ];

  for (const check of checks) {
    if (fs.existsSync(path.join(cwd, check.file))) {
      detected.push({ value: check.file, label: `${check.label} (detected)`, hint: check.hint });
    }
  }

  const options = [
    { value: 'auto', label: 'Auto-detect', hint: 'scan for known manifests at runtime' },
    ...detected,
    ...checks
      .filter((c) => !detected.some((d) => d.value === c.file))
      .map((c) => ({ value: c.file, label: c.label, hint: c.hint })),
    { value: 'git-tag', label: 'Git tags', hint: 'Go / Swift — version from tags' },
  ];

  const result = await p.select({
    message: 'Version source',
    options,
    initialValue: detected.length === 1 ? detected[0].value : 'auto',
  });

  if (p.isCancel(result)) return null;
  return result;
}

interface ConfigInput {
  type: 'semver' | 'calver';
  format?: string;
  manifest?: string;
  hooks: boolean;
  changelog: boolean;
}

function buildConfig(input: ConfigInput): Partial<VersionGuardConfig> {
  const config: Record<string, unknown> = {
    versioning: {
      type: input.type,
      ...(input.type === 'calver' && input.format
        ? {
            calver: {
              format: input.format,
              preventFutureDates: true,
            },
          }
        : {}),
    },
  };

  if (input.manifest) {
    config.manifest = { source: input.manifest };
  }

  config.sync = {
    files: ['README.md', 'CHANGELOG.md'],
    patterns: [
      {
        regex: '(version\\s*[=:]\\s*["\'])(.+?)(["\'])',
        template: '$1{{version}}$3',
      },
      {
        regex: '(##\\s*\\[)(.+?)(\\])',
        template: '$1{{version}}$3',
      },
    ],
  };

  config.changelog = {
    enabled: input.changelog,
    file: 'CHANGELOG.md',
    strict: true,
    requireEntry: input.changelog,
  };

  config.git = {
    hooks: {
      'pre-commit': input.hooks,
      'pre-push': input.hooks,
      'post-tag': input.hooks,
    },
    enforceHooks: input.hooks,
  };

  config.ignore = ['node_modules/**', 'dist/**', '.git/**', '*.lock', '.changeset/**'];

  return config;
}

function writeConfig(cwd: string, config: Partial<VersionGuardConfig>): string {
  const configPath = path.join(cwd, '.versionguard.yml');
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  fs.writeFileSync(configPath, content, 'utf-8');
  return configPath;
}

function findExistingConfig(cwd: string): string | null {
  for (const name of [
    '.versionguard.yml',
    '.versionguard.yaml',
    'versionguard.yml',
    'versionguard.yaml',
  ]) {
    const full = path.join(cwd, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}
