/**
 * YAML-based version source provider for pubspec.yaml and similar manifests.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import * as yaml from 'js-yaml';

import type { VersionSourceProvider } from './provider';
import { escapeRegExp, getNestedValue } from './utils';

/**
 * Reads and writes version strings from YAML manifest files.
 *
 * @remarks
 * Supports dotted key paths (e.g. `'flutter.version'`) for nested values.
 * Uses targeted regex replacement for writes to preserve comments and formatting.
 *
 * @public
 * @since 0.3.0
 */
export class YamlVersionSource implements VersionSourceProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /** Filename of the YAML manifest (e.g. `'pubspec.yaml'`). */
  readonly manifestFile: string;

  /** Dotted key path to the version field within the YAML document. */
  private readonly versionKey: string;

  /**
   * Creates a new YAML version source.
   *
   * @param manifestFile - YAML manifest filename.
   * @param versionKey - Dotted key path to the version field.
   */
  constructor(manifestFile: string = 'pubspec.yaml', versionKey: string = 'version') {
    this.name = manifestFile;
    this.manifestFile = manifestFile;
    this.versionKey = versionKey;
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
   * Reads the version string from the YAML manifest.
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
    const parsed = yaml.load(content) as Record<string, unknown> | undefined;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Failed to parse ${this.manifestFile}`);
    }

    // L-005: Support nested dotted paths
    const version = getNestedValue(parsed, this.versionKey);
    if (typeof version !== 'string' || version.length === 0) {
      if (typeof version === 'number') {
        return String(version);
      }
      throw new Error(`No version field in ${this.manifestFile}`);
    }

    return version;
  }

  /**
   * Writes a version string to the YAML manifest, preserving formatting.
   *
   * @param version - Version string to write.
   * @param cwd - Project directory containing the manifest.
   */
  setVersion(version: string, cwd: string): void {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    // The last segment of the dotted key is the YAML key to match in the file
    const keyParts = this.versionKey.split('.');
    const leafKey = keyParts[keyParts.length - 1];

    // Use regex replacement to preserve comments, formatting, and quote style
    const content = fs.readFileSync(filePath, 'utf-8');
    const regex = new RegExp(`^(\\s*${escapeRegExp(leafKey)}:\\s*)(["']?)(.+?)\\2\\s*$`, 'm');
    const updated = content.replace(regex, `$1$2${version}$2`);

    if (updated === content) {
      throw new Error(`Could not find version field to update in ${this.manifestFile}`);
    }

    fs.writeFileSync(filePath, updated, 'utf-8');
  }
}
