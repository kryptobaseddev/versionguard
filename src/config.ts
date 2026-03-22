import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as yaml from 'js-yaml';

import type { VersionGuardConfig } from './types';

const CONFIG_FILE_NAMES = [
  '.versionguard.yml',
  '.versionguard.yaml',
  'versionguard.yml',
  'versionguard.yaml',
];

const DEFAULT_CONFIG: VersionGuardConfig = {
  versioning: {
    type: 'semver',
    calver: {
      format: 'YYYY.MM.PATCH',
      preventFutureDates: true,
    },
  },
  sync: {
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
  },
  changelog: {
    enabled: true,
    file: 'CHANGELOG.md',
    strict: true,
    requireEntry: true,
  },
  git: {
    hooks: {
      'pre-commit': true,
      'pre-push': true,
      'post-tag': true,
    },
    enforceHooks: true,
  },
  ignore: ['node_modules/**', 'dist/**', '.git/**', '*.lock', 'package-lock.json'],
};

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * Returns a deep-cloned copy of the built-in VersionGuard configuration.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * A fresh clone is returned so callers can safely modify the result without
 * mutating shared defaults.
 *
 * @returns The default VersionGuard configuration.
 * @example
 * ```ts
 * import { getDefaultConfig } from 'versionguard';
 *
 * const config = getDefaultConfig();
 * ```
 */
export function getDefaultConfig(): VersionGuardConfig {
  return structuredClone(DEFAULT_CONFIG);
}

/**
 * Finds the first supported VersionGuard config file in a directory.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Search order follows `CONFIG_FILE_NAMES`, so `.versionguard.yml` takes
 * precedence over the other supported filenames.
 *
 * @param cwd - Directory to search.
 * @returns The resolved config path, or `null` when no config file exists.
 * @example
 * ```ts
 * import { findConfig } from 'versionguard';
 *
 * const configPath = findConfig(process.cwd());
 * ```
 */
export function findConfig(cwd: string = process.cwd()): string | null {
  for (const fileName of CONFIG_FILE_NAMES) {
    const fullPath = path.join(cwd, fileName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Loads a VersionGuard config file from disk.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The parsed YAML object is merged with the built-in defaults so omitted keys
 * inherit their default values.
 *
 * @param configPath - Path to the YAML config file.
 * @returns The merged VersionGuard configuration.
 * @example
 * ```ts
 * import { loadConfig } from 'versionguard';
 *
 * const config = loadConfig('.versionguard.yml');
 * ```
 */
export function loadConfig(configPath: string): VersionGuardConfig {
  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(content);

  if (parsed === undefined) {
    return getDefaultConfig();
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`Config file must contain a YAML object: ${configPath}`);
  }

  return mergeDeep(getDefaultConfig(), parsed);
}

/**
 * Resolves the active VersionGuard configuration for a project.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * If no config file is present, this falls back to the built-in defaults.
 *
 * @param cwd - Project directory to inspect.
 * @returns The resolved VersionGuard configuration.
 * @example
 * ```ts
 * import { getConfig } from 'versionguard';
 *
 * const config = getConfig(process.cwd());
 * ```
 */
export function getConfig(cwd: string = process.cwd()): VersionGuardConfig {
  const configPath = findConfig(cwd);
  return configPath ? loadConfig(configPath) : getDefaultConfig();
}

/**
 * Initializes a new VersionGuard config file in a project.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This writes `.versionguard.yml` using the bundled example when available,
 * otherwise it writes a generated default configuration.
 *
 * @param cwd - Project directory where the config should be created.
 * @returns The path to the created config file.
 * @example
 * ```ts
 * import { initConfig } from 'versionguard';
 *
 * const configPath = initConfig(process.cwd());
 * ```
 */
export function initConfig(cwd: string = process.cwd()): string {
  const configPath = path.join(cwd, '.versionguard.yml');
  const existingConfigPath = findConfig(cwd);

  if (existingConfigPath) {
    throw new Error(`Config file already exists: ${existingConfigPath}`);
  }

  const examplePath = path.join(MODULE_DIR, '..', '.versionguard.yml.example');
  const content = fs.existsSync(examplePath)
    ? fs.readFileSync(examplePath, 'utf-8')
    : generateDefaultConfig();

  fs.writeFileSync(configPath, content, 'utf-8');
  return configPath;
}

function generateDefaultConfig(): string {
  return `# VersionGuard Configuration
versioning:
  type: semver

sync:
  files:
    - "README.md"
    - "CHANGELOG.md"
  patterns:
    - regex: '(version\\s*[=:]\\s*["''])(.+?)(["''])'
      template: '$1{{version}}$3'
    - regex: '(##\\s*\\[)(.+?)(\\])'
      template: '$1{{version}}$3'

changelog:
  enabled: true
  file: "CHANGELOG.md"
  strict: true
  requireEntry: true

git:
  hooks:
    pre-commit: true
    pre-push: true
    post-tag: true
  enforceHooks: true

ignore:
  - "node_modules/**"
  - "dist/**"
  - ".git/**"
`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep<T>(target: T, source: Partial<T>): T {
  /* v8 ignore next 3 -- defensive fallback for non-object nested overrides */
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return (source ?? target) as T;
  }

  const output: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const current = output[key];
    output[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeDeep(current, value) : value;
  }

  return output as T;
}
