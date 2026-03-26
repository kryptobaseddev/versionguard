/**
 * Shared scheme-rule validation helpers used by both SemVer and CalVer.
 *
 * @packageDocumentation
 */

import type { SchemeRules, ValidationError } from './types';

/**
 * Validates a pre-release / modifier tag against the allowed modifiers list.
 *
 * @remarks
 * Both SemVer prerelease identifiers (e.g. `alpha` from `1.2.3-alpha.1`) and
 * CalVer modifiers (e.g. `rc` from `2026.3.0-rc2`) share the same validation
 * logic: strip trailing digits/dots to get the base tag, then check the
 * whitelist.
 *
 * @param modifier - Raw modifier string (e.g. `"alpha.1"`, `"rc2"`, `"dev"`).
 * @param schemeRules - Scheme rules containing the allowed modifiers list.
 * @returns A validation error when the modifier is disallowed, otherwise `null`.
 *
 * @example
 * ```ts
 * import { validateModifier } from './scheme-rules';
 *
 * const error = validateModifier('alpha.1', { maxNumericSegments: 3, allowedModifiers: ['dev', 'alpha', 'beta', 'rc'] });
 * // => null (allowed)
 * ```
 *
 * @internal
 * @since 0.6.0
 */
export function validateModifier(
  modifier: string,
  schemeRules?: SchemeRules,
): ValidationError | null {
  if (!modifier || !schemeRules?.allowedModifiers) return null;

  // Extract base modifier name: "alpha.1" → "alpha", "rc2" → "rc", "dev" → "dev"
  const baseModifier = modifier.replace(/[\d.]+$/, '') || modifier;

  if (!schemeRules.allowedModifiers.includes(baseModifier)) {
    return {
      message: `Modifier "${modifier}" is not allowed. Allowed: ${schemeRules.allowedModifiers.join(', ')}`,
      severity: 'error',
    };
  }

  return null;
}
