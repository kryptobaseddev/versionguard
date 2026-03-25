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
 * @public
 * @since 0.3.0
 */
export class JsonVersionSource implements VersionSourceProvider {
  readonly name: string;
  readonly manifestFile: string;
  private readonly versionPath: string;

  constructor(manifestFile: string = 'package.json', versionPath: string = 'version') {
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

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    const version = getNestedValue(content, this.versionPath);

    if (typeof version !== 'string' || version.length === 0) {
      throw new Error(`No version field in ${this.manifestFile}`);
    }

    return version;
  }

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
