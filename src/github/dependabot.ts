/**
 * Dependabot configuration generation from detected project manifests.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import * as yaml from 'js-yaml';

import type { ManifestSourceType } from '../types';

/**
 * Maps VersionGuard manifest source types to Dependabot package-ecosystem values.
 *
 * @remarks
 * Returns `null` for sources that have no Dependabot equivalent (VERSION files,
 * git tags, custom regex). The `auto` source is resolved at detection time,
 * not mapped directly.
 *
 * @public
 * @since 0.9.0
 */
export const MANIFEST_TO_ECOSYSTEM: Record<ManifestSourceType, string | null> = {
  auto: null,
  'package.json': 'npm',
  'composer.json': 'composer',
  'Cargo.toml': 'cargo',
  'pyproject.toml': 'pip',
  'pubspec.yaml': 'pub',
  'pom.xml': 'maven',
  VERSION: null,
  'git-tag': null,
  custom: null,
};

interface DependabotUpdate {
  'package-ecosystem': string;
  directory: string;
  schedule: { interval: string };
  groups?: Record<string, { 'update-types': string[] }>;
}

/**
 * Generates Dependabot YAML configuration from detected manifests.
 *
 * @remarks
 * Each detected manifest is mapped to its Dependabot ecosystem. A
 * `github-actions` entry is always appended since any GitHub-hosted
 * project benefits from action version updates.
 *
 * @param manifests - Detected manifest source types from the project.
 * @returns The Dependabot configuration as a YAML string.
 *
 * @example
 * ```ts
 * import { generateDependabotConfig } from 'versionguard';
 *
 * const config = generateDependabotConfig(['package.json', 'Cargo.toml']);
 * ```
 *
 * @public
 * @since 0.9.0
 */
export function generateDependabotConfig(manifests: ManifestSourceType[]): string {
  const ecosystems = new Set<string>();

  for (const manifest of manifests) {
    const ecosystem = MANIFEST_TO_ECOSYSTEM[manifest];
    if (ecosystem) {
      ecosystems.add(ecosystem);
    }
  }

  const updates: DependabotUpdate[] = [];

  for (const ecosystem of ecosystems) {
    updates.push({
      'package-ecosystem': ecosystem,
      directory: '/',
      schedule: { interval: 'weekly' },
      groups: { 'minor-and-patch': { 'update-types': ['minor', 'patch'] } },
    });
  }

  // Always include GitHub Actions for GitHub-hosted repos
  updates.push({
    'package-ecosystem': 'github-actions',
    directory: '/',
    schedule: { interval: 'weekly' },
  });

  return yaml.dump(
    { version: 2, updates },
    { indent: 2, lineWidth: 120, noRefs: true, quotingType: '"', forceQuotes: false },
  );
}

/**
 * Writes a Dependabot configuration file to `.github/dependabot.yml`.
 *
 * @remarks
 * Creates the `.github` directory if it does not exist. Overwrites any
 * existing `dependabot.yml` with the supplied content.
 *
 * @param cwd - Project directory.
 * @param content - YAML content to write.
 * @returns The absolute path to the created file.
 *
 * @example
 * ```ts
 * import { writeDependabotConfig } from 'versionguard';
 *
 * const filePath = writeDependabotConfig(process.cwd(), 'version: 2\nupdates: []\n');
 * ```
 *
 * @public
 * @since 0.9.0
 */
export function writeDependabotConfig(cwd: string, content: string): string {
  const dir = path.join(cwd, '.github');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'dependabot.yml');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Checks whether `.github/dependabot.yml` exists in the project.
 *
 * @remarks
 * Used during init to avoid overwriting a user-managed Dependabot config.
 *
 * @param cwd - Project directory.
 * @returns `true` when the file exists.
 *
 * @example
 * ```ts
 * import { dependabotConfigExists } from 'versionguard';
 *
 * if (!dependabotConfigExists(process.cwd())) {
 *   console.log('No Dependabot config found');
 * }
 * ```
 *
 * @public
 * @since 0.9.0
 */
export function dependabotConfigExists(cwd: string): boolean {
  return fs.existsSync(path.join(cwd, '.github', 'dependabot.yml'));
}
