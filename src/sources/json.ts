/**
 * JSON-based version source provider for package.json and composer.json.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { VersionSourceProvider } from './provider';

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

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    setNestedValue(content, this.versionPath, version);
    fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf-8');
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

function setNestedValue(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
  const keys = dotPath.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}
