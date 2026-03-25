/**
 * Version source provider interface and base utilities.
 *
 * @packageDocumentation
 * @public
 */

/**
 * Abstraction for reading and writing a version string from any manifest format.
 *
 * @public
 * @since 0.3.0
 */
export interface VersionSourceProvider {
  /** Human-readable provider name (e.g. `'package.json'`, `'Cargo.toml'`). */
  readonly name: string;

  /** Default manifest filename this provider handles. */
  readonly manifestFile: string;

  /** Returns `true` when the manifest file exists in `cwd`. */
  exists(cwd: string): boolean;

  /** Reads the version string from the manifest. Throws if missing or unreadable. */
  getVersion(cwd: string): string;

  /** Writes a version string back to the manifest. Throws if the file does not exist. */
  setVersion(version: string, cwd: string): void;
}
