/**
 * TOML-based version source provider for Cargo.toml and pyproject.toml.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { parse } from 'smol-toml';

import type { VersionSourceProvider } from './provider';
import { escapeRegExp, getNestedValue } from './utils';

/**
 * Reads and writes version strings from TOML manifest files.
 *
 * @remarks
 * Uses targeted regex replacement for writes to preserve file formatting,
 * comments, and whitespace. Supports standard section headers, dotted keys,
 * and inline table syntax.
 *
 * @public
 * @since 0.3.0
 */
export class TomlVersionSource implements VersionSourceProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /** Filename of the TOML manifest (e.g. `'Cargo.toml'`). */
  readonly manifestFile: string;

  /** Dotted key path to the version field within the TOML document. */
  private readonly versionPath: string;

  /**
   * Creates a new TOML version source.
   *
   * @param manifestFile - TOML manifest filename.
   * @param versionPath - Dotted key path to the version field.
   */
  constructor(manifestFile: string = 'Cargo.toml', versionPath: string = 'package.version') {
    this.name = manifestFile;
    this.manifestFile = manifestFile;
    this.versionPath = versionPath;
  }

  /**
   * Returns `true` when the manifest file exists in `cwd`.
   *
   * @param cwd - Project directory to check.
   * @returns Whether the manifest file exists.
   */
  exists(cwd: string): boolean {
    return fs.existsSync(path.join(cwd, this.manifestFile));
  }

  /**
   * Reads the version string from the TOML manifest.
   *
   * @param cwd - Project directory containing the manifest.
   * @returns The version string extracted from the manifest.
   */
  getVersion(cwd: string): string {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parse(content) as Record<string, unknown>;
    const version = getNestedValue(parsed, this.versionPath);

    if (typeof version !== 'string' || version.length === 0) {
      throw new Error(`No version field at '${this.versionPath}' in ${this.manifestFile}`);
    }

    return version;
  }

  /**
   * Writes a version string to the TOML manifest, preserving formatting.
   *
   * @param version - Version string to write.
   * @param cwd - Project directory containing the manifest.
   */
  setVersion(version: string, cwd: string): void {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const sectionKey = this.getSectionKey();
    const updated = replaceTomlVersion(content, sectionKey, version);

    if (updated === content) {
      throw new Error(`Could not find version field to update in ${this.manifestFile}`);
    }

    fs.writeFileSync(filePath, updated, 'utf-8');
  }

  /**
   * Splits the dotted version path into a TOML section name and key name.
   *
   * @returns An object with `section` and `key` components.
   */
  private getSectionKey(): { section: string; key: string } {
    const parts = this.versionPath.split('.');
    if (parts.length === 1) {
      return { section: '', key: parts[0] };
    }
    return {
      section: parts.slice(0, -1).join('.'),
      key: parts[parts.length - 1],
    };
  }
}

/**
 * Replace a version value within a TOML file, preserving formatting.
 *
 * Tries three patterns in order:
 * 1. [section] header + key = "value" line (standard)
 * 2. Dotted key syntax: section.key = "value" (M-004)
 * 3. Inline table: section = { ..., key = "value", ... } (M-010)
 */
function replaceTomlVersion(
  content: string,
  target: { section: string; key: string },
  newVersion: string,
): string {
  // Pattern 1: Standard [section] header + key line
  const result = replaceInSection(content, target, newVersion);
  if (result !== content) return result;

  // Pattern 2: Dotted key syntax (M-004)
  if (target.section) {
    const dottedRegex = new RegExp(
      `^(\\s*${escapeRegExp(target.section)}\\.${escapeRegExp(target.key)}\\s*=\\s*)(["'])([^"']*)(\\2)`,
      'm',
    );
    const dottedResult = content.replace(dottedRegex, `$1$2${newVersion}$4`);
    if (dottedResult !== content) return dottedResult;
  }

  // Pattern 3: Inline table (M-010)
  if (target.section) {
    const inlineRegex = new RegExp(
      `^(\\s*${escapeRegExp(target.section)}\\s*=\\s*\\{[^}]*${escapeRegExp(target.key)}\\s*=\\s*)(["'])([^"']*)(\\2)`,
      'm',
    );
    const inlineResult = content.replace(inlineRegex, `$1$2${newVersion}$4`);
    if (inlineResult !== content) return inlineResult;
  }

  return content;
}

/** Standard section-header-based replacement. */
function replaceInSection(
  content: string,
  target: { section: string; key: string },
  newVersion: string,
): string {
  const lines = content.split('\n');
  const sectionHeader = target.section ? `[${target.section}]` : null;
  let inSection = sectionHeader === null;
  const versionRegex = new RegExp(`^(\\s*${escapeRegExp(target.key)}\\s*=\\s*)(["'])([^"']*)(\\2)`);

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (sectionHeader !== null) {
      if (trimmed === sectionHeader) {
        inSection = true;
        continue;
      }
      if (inSection && trimmed.startsWith('[') && trimmed !== sectionHeader) {
        inSection = false;
        continue;
      }
    }

    if (inSection) {
      const match = lines[i].match(versionRegex);
      if (match) {
        lines[i] = lines[i].replace(versionRegex, `$1$2${newVersion}$4`);
        return lines.join('\n');
      }
    }
  }

  return content;
}
