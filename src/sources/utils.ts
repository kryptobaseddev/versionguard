/**
 * Shared utilities for version source providers.
 *
 * @packageDocumentation
 */

/**
 * Traverses a nested object using a dotted key path.
 *
 * @param obj - Object to traverse.
 * @param dotPath - Dot-separated key path (e.g. `'package.version'`).
 * @returns The value at the path, or `undefined` if any segment is missing.
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
 * @param obj - Object to mutate.
 * @param dotPath - Dot-separated key path.
 * @param value - Value to set at the final key.
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
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
