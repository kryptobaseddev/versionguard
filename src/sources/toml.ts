/**
 * TOML-based version source provider for Cargo.toml and pyproject.toml.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { parse } from 'smol-toml';

import type { VersionSourceProvider } from './provider';

/**
 * Reads and writes version strings from TOML manifest files.
 *
 * Uses targeted regex replacement for writes to preserve file formatting.
 *
 * @public
 * @since 0.3.0
 */
export class TomlVersionSource implements VersionSourceProvider {
  readonly name: string;
  readonly manifestFile: string;
  private readonly versionPath: string;

  constructor(manifestFile: string = 'Cargo.toml', versionPath: string = 'package.version') {
    this.name = manifestFile;
    this.manifestFile = manifestFile;
    this.versionPath = versionPath;
  }

  exists(cwd: string): boolean {
    return fs.existsSync(path.join(cwd, this.manifestFile));
  }

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

  setVersion(version: string, cwd: string): void {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    // Use regex replacement to preserve formatting instead of parse-modify-serialize
    const content = fs.readFileSync(filePath, 'utf-8');
    const sectionKey = this.getSectionKey();
    const updated = replaceTomlVersion(content, sectionKey, version);

    if (updated === content) {
      throw new Error(`Could not find version field to update in ${this.manifestFile}`);
    }

    fs.writeFileSync(filePath, updated, 'utf-8');
  }

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

function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
  let current: unknown = obj;
  for (const key of dotPath.split('.')) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Replace a version value within a TOML file, preserving formatting.
 *
 * Finds the `[section]` header, then replaces the `key = "..."` line within it.
 */
function replaceTomlVersion(
  content: string,
  target: { section: string; key: string },
  newVersion: string,
): string {
  const lines = content.split('\n');
  const sectionHeader = target.section ? `[${target.section}]` : null;
  let inSection = sectionHeader === null;
  // Match both double-quoted and single-quoted TOML strings
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
        // Preserve the original quote style (match[2] is the quote char)
        lines[i] = lines[i].replace(versionRegex, `$1$2${newVersion}$4`);
        return lines.join('\n');
      }
    }
  }

  return content;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
