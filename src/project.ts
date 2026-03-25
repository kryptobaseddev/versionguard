import * as fs from 'node:fs';
import * as path from 'node:path';
import type { VersionSourceProvider } from './sources/provider';
import { resolveVersionSource } from './sources/resolve';
import type { ManifestConfig } from './types';

/**
 * JSON-compatible scalar, array, or object value used by package metadata.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export type PackageJsonValue =
  | boolean
  | null
  | number
  | string
  | PackageJsonArray
  | PackageJsonObject;

/**
 * Recursive array type used for arbitrary JSON-compatible package values.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export type PackageJsonArray = PackageJsonValue[];

/**
 * Recursive object type used for arbitrary JSON-compatible package values.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface PackageJsonObject {
  [key: string]: PackageJsonValue;
}

/**
 * Minimal shape of a `package.json` document used by VersionGuard.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface PackageJson {
  /**
   * Package name.
   *
   * @defaultValue `undefined`
   */
  name?: string;
  /**
   * Package version string.
   *
   * @defaultValue `undefined`
   */
  version?: string;
  [key: string]: PackageJsonValue | undefined;
}

/**
 * Gets the `package.json` path for a project directory.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This is a convenience helper used by the package read and write helpers.
 *
 * @param cwd - Project directory containing `package.json`.
 * @returns The resolved `package.json` path.
 * @example
 * ```ts
 * import { getPackageJsonPath } from 'versionguard';
 *
 * const packagePath = getPackageJsonPath(process.cwd());
 * ```
 */
export function getPackageJsonPath(cwd: string = process.cwd()): string {
  return path.join(cwd, 'package.json');
}

/**
 * Reads and parses a project's `package.json` file.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * An error is thrown when `package.json` does not exist in the requested
 * directory.
 *
 * @param cwd - Project directory containing `package.json`.
 * @returns The parsed `package.json` document.
 * @example
 * ```ts
 * import { readPackageJson } from 'versionguard';
 *
 * const pkg = readPackageJson(process.cwd());
 * ```
 */
export function readPackageJson(cwd: string = process.cwd()): PackageJson {
  const packagePath = getPackageJsonPath(cwd);

  if (!fs.existsSync(packagePath)) {
    throw new Error(`package.json not found in ${cwd}`);
  }

  return JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as PackageJson;
}

/**
 * Writes a `package.json` document back to disk.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * Output is formatted with two-space indentation and always ends with a
 * trailing newline.
 *
 * @param pkg - Parsed `package.json` data to write.
 * @param cwd - Project directory containing `package.json`.
 * @example
 * ```ts
 * import { readPackageJson, writePackageJson } from 'versionguard';
 *
 * const pkg = readPackageJson(process.cwd());
 * writePackageJson(pkg, process.cwd());
 * ```
 */
export function writePackageJson(pkg: PackageJson, cwd: string = process.cwd()): void {
  fs.writeFileSync(getPackageJsonPath(cwd), `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
}

/**
 * Gets the version string from the project manifest.
 *
 * When a `manifest` config is provided, uses the configured version source
 * provider (auto-detection or explicit). Falls back to `package.json` for
 * backwards compatibility when no config is provided.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * This throws when the manifest file does not exist or does not contain
 * a version field.
 *
 * @param cwd - Project directory containing the manifest.
 * @param manifest - Optional manifest configuration for language-agnostic support.
 * @returns The project version string.
 * @example
 * ```ts
 * import { getPackageVersion } from 'versionguard';
 *
 * // Read from package.json (legacy fallback)
 * const version = getPackageVersion(process.cwd());
 *
 * // Read from a configured manifest source
 * const versionAlt = getPackageVersion(process.cwd(), { source: 'Cargo.toml' });
 * ```
 */
export function getPackageVersion(cwd: string = process.cwd(), manifest?: ManifestConfig): string {
  if (manifest) {
    const provider = resolveVersionSource(manifest, cwd);
    return provider.getVersion(cwd);
  }

  // Legacy fallback: read directly from package.json
  const pkg = readPackageJson(cwd);

  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    throw new Error('No version field in package.json');
  }

  return pkg.version;
}

/**
 * Sets the version field in the project manifest.
 *
 * When a `manifest` config is provided, uses the configured version source
 * provider. Falls back to `package.json` for backwards compatibility when
 * no config is provided.
 *
 * @public
 * @since 0.1.0
 * @remarks
 * The existing document is read, the version field is replaced, and the
 * file is written back to disk.
 *
 * @param version - Version string to persist.
 * @param cwd - Project directory containing the manifest.
 * @param manifest - Optional manifest configuration for language-agnostic support.
 * @example
 * ```ts
 * import { setPackageVersion } from 'versionguard';
 *
 * // Write to package.json (legacy fallback)
 * setPackageVersion('1.2.3', process.cwd());
 *
 * // Write to a configured manifest source
 * setPackageVersion('1.2.3', process.cwd(), { source: 'Cargo.toml' });
 * ```
 */
export function setPackageVersion(
  version: string,
  cwd: string = process.cwd(),
  manifest?: ManifestConfig,
): void {
  if (manifest) {
    const provider = resolveVersionSource(manifest, cwd);
    provider.setVersion(version, cwd);
    return;
  }

  // Legacy fallback: write directly to package.json
  const pkg = readPackageJson(cwd);
  pkg.version = version;
  writePackageJson(pkg, cwd);
}

/**
 * Resolves the version source provider for a project.
 *
 * @remarks
 * Delegates to `resolveVersionSource` to create the appropriate provider
 * for the configured manifest type. Use this when you need direct access
 * to the provider's `exists`, `getVersion`, and `setVersion` methods.
 *
 * @param manifest - Manifest configuration.
 * @param cwd - Project directory.
 * @returns The resolved provider instance.
 *
 * @example
 * ```ts
 * import { getVersionSource } from 'versionguard';
 *
 * const source = getVersionSource({ source: 'package.json' }, process.cwd());
 * const version = source.getVersion(process.cwd());
 * ```
 *
 * @public
 * @since 0.3.0
 */
export function getVersionSource(
  manifest: ManifestConfig,
  cwd: string = process.cwd(),
): VersionSourceProvider {
  return resolveVersionSource(manifest, cwd);
}
