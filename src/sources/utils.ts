/**
 * Shared utilities for version source providers.
 *
 * @packageDocumentation
 */

/**
 * Traverses a nested object using a dotted key path.
 *
 * @remarks
 * Walks each segment of the dotted path in order, returning `undefined` as
 * soon as a missing or non-object segment is encountered.
 *
 * @param obj - Object to traverse.
 * @param dotPath - Dot-separated key path (e.g. `'package.version'`).
 * @returns The value at the path, or `undefined` if any segment is missing.
 *
 * @example
 * ```ts
 * import { getNestedValue } from './utils';
 *
 * const obj = { package: { version: '1.0.0' } };
 * const version = getNestedValue(obj, 'package.version'); // '1.0.0'
 * ```
 *
 * @public
 * @since 0.3.0
 */
export function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
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
 * Sets a value at a dotted key path, throwing if intermediate segments are missing.
 *
 * @remarks
 * Traverses each intermediate segment and throws when a segment is missing or
 * not an object. The final key is created or overwritten.
 *
 * @param obj - Object to mutate.
 * @param dotPath - Dot-separated key path.
 * @param value - Value to set at the final key.
 *
 * @example
 * ```ts
 * import { setNestedValue } from './utils';
 *
 * const obj = { package: { version: '1.0.0' } };
 * setNestedValue(obj, 'package.version', '2.0.0');
 * ```
 *
 * @public
 * @since 0.3.0
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  dotPath: string,
  value: unknown,
): void {
  const keys = dotPath.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = current[keys[i]];
    if (typeof next !== 'object' || next === null) {
      throw new Error(`Missing intermediate key '${keys.slice(0, i + 1).join('.')}' in manifest`);
    }
    current = next as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Escapes special regex characters in a string for safe use in `new RegExp()`.
 *
 * @remarks
 * Prefixes every character that has special meaning in a regular expression
 * with a backslash so the resulting string matches literally.
 *
 * @param value - Raw string to escape.
 * @returns The escaped string safe for embedding in a `RegExp` constructor.
 *
 * @example
 * ```ts
 * import { escapeRegExp } from './utils';
 *
 * const escaped = escapeRegExp('file.txt'); // 'file\\.txt'
 * ```
 *
 * @public
 * @since 0.3.0
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
