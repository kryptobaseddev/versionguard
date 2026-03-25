/**
 * JSON-based version source provider for package.json and composer.json.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { VersionSourceProvider } from './provider';
import { getNestedValue, setNestedValue } from './utils';

/**
 * Reads and writes version strings from JSON manifest files.
 *
 * @remarks
 * Supports dotted key paths for nested version fields and preserves the
 * original indentation style when writing back to disk.
 *
 * @public
 * @since 0.3.0
 */
export class JsonVersionSource implements VersionSourceProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /** Filename of the JSON manifest (e.g. `'package.json'`). */
  readonly manifestFile: string;

  /** Dotted key path to the version field within the JSON document. */
  private readonly versionPath: string;

  /**
   * Creates a new JSON version source.
   *
   * @param manifestFile - JSON manifest filename.
   * @param versionPath - Dotted key path to the version field.
   */
  constructor(manifestFile: string = 'package.json', versionPath: string = 'version') {
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
   * Reads the version string from the JSON manifest.
   *
   * @param cwd - Project directory containing the manifest.
   * @returns The version string extracted from the manifest.
   */
  getVersion(cwd: string): string {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    const version = getNestedValue(content, this.versionPath);

    if (typeof version !== 'string' || version.length === 0) {
      throw new Error(`No version field in ${this.manifestFile}`);
    }

    return version;
  }

  /**
   * Writes a version string to the JSON manifest, preserving indentation.
   *
   * @param version - Version string to write.
   * @param cwd - Project directory containing the manifest.
   */
  setVersion(version: string, cwd: string): void {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    // M-008: Detect original indentation to preserve formatting
    const raw = fs.readFileSync(filePath, 'utf-8');
    const indentMatch = raw.match(/^(\s+)"/m);
    const indent = indentMatch?.[1]?.length ?? 2;

    const content = JSON.parse(raw) as Record<string, unknown>;
    setNestedValue(content, this.versionPath, version);
    fs.writeFileSync(filePath, `${JSON.stringify(content, null, indent)}\n`, 'utf-8');
  }
}
