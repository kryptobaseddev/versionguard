import * as fs from 'node:fs';
import * as path from 'node:path';

import { globSync } from 'glob';

import type { ScanConfig, SyncConfig, SyncPattern, SyncResult, VersionMismatch } from './types';

function resolveFiles(patterns: string[], cwd: string, ignore: string[] = []): string[] {
  return [
    ...new Set(patterns.flatMap((pattern) => globSync(pattern, { cwd, absolute: true, ignore }))),
  ].sort();
}

function getLineNumber(content: string, offset: number): number {
  return content.slice(0, offset).split('\n').length;
}

function extractVersion(groups: string[]): string {
  return groups[1] ?? groups[0] ?? '';
}

function applyTemplate(template: string, groups: string[], version: string): string {
  return template.replace(/\$(\d+)|\{\{version\}\}/g, (match, groupIndex: string | undefined) => {
    if (match === '{{version}}') {
      return version;
    }

    return groups[Number.parseInt(groupIndex ?? '0', 10) - 1] ?? '';
  });
}

function stringifyCapture(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Syncs a JSON file by targeting only the top-level "version" field,
 * avoiding nested keys like scripts.version.
 */
function syncJsonFile(filePath: string, version: string): SyncResult {
  const original = fs.readFileSync(filePath, 'utf-8');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(original) as Record<string, unknown>;
  } catch {
    // Not valid JSON — fall through to regex-based sync
    return { file: filePath, updated: false, changes: [] };
  }

  if (typeof parsed.version !== 'string' || parsed.version === version) {
    return { file: filePath, updated: false, changes: [] };
  }

  const oldVersion = parsed.version;
  // Match only a top-level "version" key (0-4 spaces indent = top-level in standard JSON)
  const updated = original.replace(/^(\s{0,4}"version"\s*:\s*")([^"]+)(")/m, `$1${version}$3`);

  if (updated === original) {
    return { file: filePath, updated: false, changes: [] };
  }

  fs.writeFileSync(filePath, updated, 'utf-8');
  return {
    file: filePath,
    updated: true,
    changes: [
      {
        line: getLineNumber(original, original.indexOf(`"${oldVersion}"`)),
        oldValue: oldVersion,
        newValue: version,
      },
    ],
  };
}

/**
 * Checks a JSON file for a top-level version mismatch, ignoring nested keys.
 */
function checkJsonVersionMismatch(
  filePath: string,
  expectedVersion: string,
  cwd: string,
): VersionMismatch[] {
  const content = fs.readFileSync(filePath, 'utf-8');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return [];
  }

  if (typeof parsed.version !== 'string') {
    return [];
  }

  if (parsed.version !== expectedVersion && parsed.version !== 'Unreleased') {
    const match = content.match(/^(\s{0,4}"version"\s*:\s*")([^"]+)(")/m);
    const line = match ? getLineNumber(content, content.indexOf(match[0])) : 1;
    return [{ file: path.relative(cwd, filePath), line, found: parsed.version }];
  }

  return [];
}

/**
 * Synchronizes configured files to a single version string.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * File globs are resolved relative to `cwd`, then each matched file is updated
 * with the configured replacement patterns.
 *
 * @param version - Version string to write into matching files.
 * @param config - Sync configuration describing files and replacement patterns.
 * @param cwd - Project directory used to resolve file globs.
 * @returns A sync result for each resolved file.
 * @example
 * ```ts
 * import { getDefaultConfig, syncVersion } from 'versionguard';
 *
 * const results = syncVersion('1.2.3', getDefaultConfig().sync, process.cwd());
 * ```
 */
export function syncVersion(
  version: string,
  config: SyncConfig,
  cwd: string = process.cwd(),
): SyncResult[] {
  return resolveFiles(config.files, cwd).map((filePath) =>
    syncFile(filePath, version, config.patterns),
  );
}

/**
 * Synchronizes a single file to a target version.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Each configured regex is applied globally, and `{{version}}` placeholders in
 * templates are replaced with the supplied version.
 *
 * @param filePath - Absolute or relative path to the file to update.
 * @param version - Version string to write.
 * @param patterns - Replacement patterns to apply.
 * @returns A result describing whether the file changed and what changed.
 * @example
 * ```ts
 * import { getDefaultConfig, syncFile } from 'versionguard';
 *
 * const result = syncFile('README.md', '1.2.3', getDefaultConfig().sync.patterns);
 * ```
 */
export function syncFile(filePath: string, version: string, patterns: SyncPattern[]): SyncResult {
  if (filePath.endsWith('.json')) {
    return syncJsonFile(filePath, version);
  }

  const original = fs.readFileSync(filePath, 'utf-8');
  let updatedContent = original;
  const changes: SyncResult['changes'] = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex, 'gm');
    updatedContent = updatedContent.replace(regex, (match, ...args: unknown[]) => {
      const hasNamedGroups = typeof args.at(-1) === 'object' && args.at(-1) !== null;
      const offsetIndex = hasNamedGroups ? -3 : -2;
      const offset = args.at(offsetIndex) as number;
      const groups = args.slice(0, offsetIndex).map((value) => stringifyCapture(value));
      const found = extractVersion(groups);

      if (found === 'Unreleased') {
        return match;
      }

      if (found !== version) {
        changes.push({
          line: getLineNumber(updatedContent, offset),
          oldValue: found,
          newValue: version,
        });
      }

      return applyTemplate(pattern.template, groups, version) || match;
    });
  }

  const result: SyncResult = {
    file: filePath,
    updated: updatedContent !== original,
    changes,
  };

  if (result.updated) {
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
  }

  return result;
}

/**
 * Checks configured files for hardcoded version mismatches.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Files matching the sync config are scanned without modification, and every
 * captured version that differs from `expectedVersion` is returned.
 *
 * @param expectedVersion - Version all matching entries should use.
 * @param config - Sync configuration describing files and replacement patterns.
 * @param ignorePatterns - Glob patterns to exclude while scanning.
 * @param cwd - Project directory used to resolve file globs.
 * @returns A list of detected version mismatches.
 * @example
 * ```ts
 * import { checkHardcodedVersions, getDefaultConfig } from 'versionguard';
 *
 * const mismatches = checkHardcodedVersions(
 *   '1.2.3',
 *   getDefaultConfig().sync,
 *   getDefaultConfig().ignore,
 *   process.cwd(),
 * );
 * ```
 */
export function checkHardcodedVersions(
  expectedVersion: string,
  config: SyncConfig,
  ignorePatterns: string[],
  cwd: string = process.cwd(),
): VersionMismatch[] {
  const mismatches: VersionMismatch[] = [];
  const files = resolveFiles(config.files, cwd, ignorePatterns);

  for (const filePath of files) {
    if (filePath.endsWith('.json')) {
      mismatches.push(...checkJsonVersionMismatch(filePath, expectedVersion, cwd));
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    for (const pattern of config.patterns) {
      const regex = new RegExp(pattern.regex, 'gm');
      let match: RegExpExecArray | null = regex.exec(content);

      while (match) {
        const found = extractVersion(match.slice(1));
        if (found !== 'Unreleased' && found !== expectedVersion) {
          mismatches.push({
            file: path.relative(cwd, filePath),
            line: getLineNumber(content, match.index),
            found,
          });
        }
        match = regex.exec(content);
      }
    }
  }

  return mismatches;
}

/** Extensions that are almost certainly binary and should be skipped. */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.7z',
  '.pdf',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.wasm',
  '.mp3',
  '.mp4',
  '.webm',
  '.webp',
  '.avif',
]);

/**
 * Scans the entire repository for hardcoded version literals.
 *
 * @public
 * @since 0.8.0
 * @remarks
 * Unlike {@link checkHardcodedVersions}, which only checks files listed in
 * `sync.files`, this function globs the entire repository (respecting
 * `.gitignore` and `ignore` patterns) and applies configurable version-like
 * regex patterns. An allowlist filters out intentional references.
 *
 * @param expectedVersion - Version all matching entries should use.
 * @param scanConfig - Scan configuration with patterns and allowlist.
 * @param ignorePatterns - Glob patterns to exclude while scanning.
 * @param cwd - Project directory used to resolve file globs.
 * @returns A list of detected version mismatches across the repository.
 * @example
 * ```ts
 * import { getDefaultConfig, scanRepoForVersions } from 'versionguard';
 *
 * const config = getDefaultConfig();
 * const findings = scanRepoForVersions('1.2.3', config.scan, config.ignore, process.cwd());
 * ```
 */
export function scanRepoForVersions(
  expectedVersion: string,
  scanConfig: ScanConfig,
  ignorePatterns: string[],
  cwd: string = process.cwd(),
): VersionMismatch[] {
  const files = [
    ...new Set(
      globSync('**/*', {
        cwd,
        absolute: true,
        dot: true,
        ignore: [
          ...ignorePatterns,
          // Always skip changelogs (handled by changelog validation) and lockfiles
          'CHANGELOG.md',
          '*.lock',
          'package-lock.json',
          'yarn.lock',
          'pnpm-lock.yaml',
          // Skip VG's own config
          '.versionguard.yml',
          '.versionguard.yaml',
        ],
      }),
    ),
  ].sort();

  // Build allowlist lookup: file glob → true
  const allowedFiles = new Set(
    scanConfig.allowlist.flatMap((entry) => resolveFiles([entry.file], cwd, [])),
  );

  const mismatches: VersionMismatch[] = [];

  for (const filePath of files) {
    // Skip binary files
    if (BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase())) continue;

    // Skip files on the allowlist
    if (allowedFiles.has(filePath)) continue;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue; // unreadable file, skip
    }

    // Skip files that look binary (contain null bytes in first 8KB)
    if (content.slice(0, 8192).includes('\0')) continue;

    for (const patternStr of scanConfig.patterns) {
      const regex = new RegExp(patternStr, 'gm');
      let match = regex.exec(content);

      while (match) {
        const found = match[1] ?? match[0] ?? '';
        if (found && found !== expectedVersion && found !== 'Unreleased') {
          mismatches.push({
            file: path.relative(cwd, filePath),
            line: getLineNumber(content, match.index),
            found,
          });
        }
        match = regex.exec(content);
      }
    }
  }

  return mismatches;
}
