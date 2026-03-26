/**
 * Project root detection and boundary validation.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Files that indicate a project root directory. */
const PROJECT_MARKERS = [
  '.versionguard.yml',
  '.versionguard.yaml',
  'versionguard.yml',
  'versionguard.yaml',
  '.git',
  'package.json',
  'Cargo.toml',
  'pyproject.toml',
  'pubspec.yaml',
  'composer.json',
  'pom.xml',
  'go.mod',
  'mix.exs',
  'Gemfile',
  '.csproj',
];

/**
 * Result of project root detection.
 *
 * @public
 * @since 0.4.0
 */
export interface ProjectRootResult {
  /** Whether a project root was found. */
  found: boolean;
  /** The resolved project root directory, or the original cwd if not found. */
  root: string;
  /** Which marker file was found. */
  marker?: string;
  /** Whether the directory has a VersionGuard config. */
  hasConfig: boolean;
  /** Whether the directory is inside a git repository. */
  hasGit: boolean;
  /** Whether a version manifest file exists. */
  hasManifest: boolean;
}

/**
 * Walks up from `startDir` to find the nearest project root.
 *
 * @remarks
 * Checks for VersionGuard config files first, then `.git`, then manifest files.
 * Stops at the filesystem root if nothing is found.
 *
 * @param startDir - Directory to start searching from.
 * @returns Detection result with the project root path and what was found.
 *
 * @example
 * ```ts
 * import { findProjectRoot } from 'versionguard';
 *
 * const result = findProjectRoot(process.cwd());
 * if (!result.found) {
 *   console.log('Not in a project directory');
 * }
 * ```
 *
 * @public
 * @since 0.4.0
 */
export function findProjectRoot(startDir: string): ProjectRootResult {
  let current = path.resolve(startDir);

  while (true) {
    for (const marker of PROJECT_MARKERS) {
      // Handle glob-like patterns (.csproj)
      if (marker.startsWith('.') && marker !== '.git' && !marker.startsWith('.version')) {
        // Check for files ending with this extension
        try {
          const files = fs.readdirSync(current);
          if (files.some((f) => f.endsWith(marker))) {
            return buildResult(current, marker);
          }
        } catch {
          // Directory not readable
        }
      } else if (fs.existsSync(path.join(current, marker))) {
        return buildResult(current, marker);
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // Reached filesystem root — not found
      return {
        found: false,
        root: path.resolve(startDir),
        hasConfig: false,
        hasGit: false,
        hasManifest: false,
      };
    }
    current = parent;
  }
}

function buildResult(root: string, marker: string): ProjectRootResult {
  const configNames = [
    '.versionguard.yml',
    '.versionguard.yaml',
    'versionguard.yml',
    'versionguard.yaml',
  ];
  return {
    found: true,
    root,
    marker,
    hasConfig: configNames.some((c) => fs.existsSync(path.join(root, c))),
    hasGit: fs.existsSync(path.join(root, '.git')),
    hasManifest: [
      'package.json',
      'Cargo.toml',
      'pyproject.toml',
      'pubspec.yaml',
      'composer.json',
      'pom.xml',
      'VERSION',
    ].some((m) => fs.existsSync(path.join(root, m))),
  };
}

/**
 * Formats a helpful error message when a command can't find a project.
 *
 * @param cwd - The directory that was checked.
 * @param command - The command that was attempted.
 * @returns A formatted, helpful error message.
 *
 * @public
 * @since 0.4.0
 */
export function formatNotProjectError(cwd: string, command: string): string {
  const dir = path.basename(cwd) || cwd;
  const lines = [
    `Not a VersionGuard project: ${dir}`,
    '',
    'No .versionguard.yml, .git directory, or manifest file found.',
    '',
    'To get started:',
    '  versionguard init          Set up a new project interactively',
    '  versionguard init --yes    Set up with defaults',
    '',
    'Or run from a project root directory:',
    `  cd /path/to/project && versionguard ${command}`,
  ];
  return lines.join('\n');
}
