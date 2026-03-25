/**
 * Version source auto-detection and resolution.
 *
 * @packageDocumentation
 */

import * as path from 'node:path';

import type { ManifestConfig, ManifestSourceType } from '../types';
import { GitTagSource } from './git-tag';
import { JsonVersionSource } from './json';
import type { VersionSourceProvider } from './provider';
import { RegexVersionSource } from './regex';
import { TomlVersionSource } from './toml';
import { VersionFileSource } from './version-file';
import { YamlVersionSource } from './yaml';

/** Valid manifest source types for config validation (H-006). */
const VALID_SOURCES = new Set<ManifestSourceType>([
  'auto',
  'package.json',
  'composer.json',
  'Cargo.toml',
  'pyproject.toml',
  'pubspec.yaml',
  'pom.xml',
  'VERSION',
  'git-tag',
  'custom',
]);

/**
 * Known manifest detection entries, ordered by priority.
 *
 * When `source` is `'auto'`, the first entry whose file exists wins.
 */
const DETECTION_TABLE: {
  file: string;
  source: ManifestSourceType;
  factory: () => VersionSourceProvider;
}[] = [
  {
    file: 'package.json',
    source: 'package.json',
    factory: () => new JsonVersionSource('package.json', 'version'),
  },
  {
    file: 'Cargo.toml',
    source: 'Cargo.toml',
    factory: () => new TomlVersionSource('Cargo.toml', 'package.version'),
  },
  {
    file: 'pyproject.toml',
    source: 'pyproject.toml',
    factory: () => new TomlVersionSource('pyproject.toml', 'project.version'),
  },
  {
    file: 'pubspec.yaml',
    source: 'pubspec.yaml',
    factory: () => new YamlVersionSource('pubspec.yaml', 'version'),
  },
  {
    file: 'composer.json',
    source: 'composer.json',
    factory: () => new JsonVersionSource('composer.json', 'version'),
  },
  {
    // H-002: Use regex that skips <parent> blocks for pom.xml
    file: 'pom.xml',
    source: 'pom.xml',
    factory: () =>
      new RegexVersionSource('pom.xml', '<project[^>]*>[\\s\\S]*?<version>([^<]+)</version>'),
  },
  { file: 'VERSION', source: 'VERSION', factory: () => new VersionFileSource('VERSION') },
];

/**
 * Validates that a file path does not escape the project directory (C-002).
 */
function assertPathContained(manifestFile: string, cwd: string): void {
  const resolved = path.resolve(cwd, manifestFile);
  const root = path.resolve(cwd);
  if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) {
    throw new Error(`Manifest path "${manifestFile}" resolves outside the project directory`);
  }
}

/**
 * Creates a provider for a specific manifest source type.
 */
function createProvider(
  source: ManifestSourceType,
  config: ManifestConfig,
  cwd: string,
): VersionSourceProvider {
  // H-006: Validate source type
  if (!VALID_SOURCES.has(source)) {
    throw new Error(
      `Invalid manifest source "${source}". Valid sources: ${[...VALID_SOURCES].join(', ')}`,
    );
  }

  switch (source) {
    case 'package.json':
      return new JsonVersionSource('package.json', config.path ?? 'version');
    case 'composer.json':
      return new JsonVersionSource('composer.json', config.path ?? 'version');
    case 'Cargo.toml':
      return new TomlVersionSource('Cargo.toml', config.path ?? 'package.version');
    case 'pyproject.toml':
      return new TomlVersionSource('pyproject.toml', config.path ?? 'project.version');
    case 'pubspec.yaml':
      return new YamlVersionSource('pubspec.yaml', config.path ?? 'version');
    case 'pom.xml':
      return new RegexVersionSource(
        'pom.xml',
        config.regex ?? '<project[^>]*>[\\s\\S]*?<version>([^<]+)</version>',
      );
    case 'VERSION':
      return new VersionFileSource(config.path ?? 'VERSION');
    case 'git-tag':
      return new GitTagSource();
    case 'custom': {
      if (!config.regex) {
        throw new Error("Custom manifest source requires a 'regex' field in manifest config");
      }
      if (!config.path) {
        throw new Error(
          "Custom manifest source requires a 'path' field (manifest filename) in manifest config",
        );
      }
      // C-002: Validate path containment for custom sources
      assertPathContained(config.path, cwd);
      return new RegexVersionSource(config.path, config.regex);
    }
    default:
      throw new Error(`Unknown manifest source: ${source}`);
  }
}

/**
 * Resolves the version source provider for a project.
 *
 * When `source` is `'auto'`, scans the project directory for known manifest
 * files and returns the first match. Falls back to `package.json` if nothing
 * is detected.
 *
 * @public
 * @since 0.3.0
 *
 * @param config - Manifest configuration from `.versionguard.yml`.
 * @param cwd - Project directory to scan.
 * @returns The resolved version source provider.
 */
export function resolveVersionSource(
  config: ManifestConfig,
  cwd: string = process.cwd(),
): VersionSourceProvider {
  if (config.source !== 'auto') {
    return createProvider(config.source, config, cwd);
  }

  // Auto-detect: scan for known manifests in priority order
  for (const entry of DETECTION_TABLE) {
    const provider = entry.factory();
    if (provider.exists(cwd)) {
      return provider;
    }
  }

  // Default fallback — will throw a clear error when getVersion is called
  return new JsonVersionSource('package.json', 'version');
}

/**
 * Detects all manifest files present in a project directory.
 *
 * Useful for polyglot projects that may have multiple version sources.
 *
 * @public
 * @since 0.3.0
 *
 * @param cwd - Project directory to scan.
 * @returns Array of detected manifest source types.
 */
export function detectManifests(cwd: string = process.cwd()): ManifestSourceType[] {
  const detected: ManifestSourceType[] = [];

  for (const entry of DETECTION_TABLE) {
    const provider = entry.factory();
    if (provider.exists(cwd)) {
      detected.push(entry.source);
    }
  }

  return detected;
}
