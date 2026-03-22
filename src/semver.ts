/**
 * Semantic version parsing, validation, comparison, and increment helpers.
 *
 * @packageDocumentation
 */

import type { SemVer, ValidationError, ValidationResult } from './types';

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Parses a semantic version string.
 *
 * @remarks
 * This helper enforces the standard SemVer structure and returns `null` when the input does not
 * match. It preserves prerelease and build identifiers as ordered string segments.
 *
 * @param version - Version string to parse.
 * @returns Parsed semantic version components, or `null` when the input is invalid.
 *
 * @example
 * ```ts
 * import { parse } from 'versionguard';
 *
 * parse('1.2.3-alpha.1+build.5')?.prerelease;
 * // => ['alpha', '1']
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function parse(version: string): SemVer | null {
  const match = version.match(SEMVER_REGEX);

  if (!match) {
    return null;
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4] ? match[4].split('.') : [],
    build: match[5] ? match[5].split('.') : [],
    raw: version,
  };
}

function getStructuralErrors(version: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (version.startsWith('v')) {
    errors.push({
      message: `Version should not start with 'v': ${version}`,
      severity: 'error',
    });
    return errors;
  }

  const mainPart = version.split(/[+-]/, 1)[0];
  const segments = mainPart.split('.');
  if (segments.length === 3) {
    const leadingZeroSegment = segments.find((segment) => /^0\d+$/.test(segment));
    if (leadingZeroSegment) {
      errors.push({
        message: `Invalid SemVer: numeric segment "${leadingZeroSegment}" has a leading zero`,
        severity: 'error',
      });
      return errors;
    }
  }

  const prerelease = version.match(/-([^+]+)/)?.[1];
  if (prerelease) {
    const invalidPrerelease = prerelease.split('.').find((segment) => /^0\d+$/.test(segment));
    if (invalidPrerelease) {
      errors.push({
        message: `Invalid SemVer: prerelease identifier "${invalidPrerelease}" has a leading zero`,
        severity: 'error',
      });
      return errors;
    }
  }

  errors.push({
    message: `Invalid SemVer format: "${version}". Expected MAJOR.MINOR.PATCH[-prerelease][+build].`,
    severity: 'error',
  });
  return errors;
}

/**
 * Validates that a string is a supported semantic version.
 *
 * @remarks
 * When validation fails, the result includes targeted structural errors for common cases such as
 * leading `v` prefixes and numeric segments with leading zeroes.
 *
 * @param version - Version string to validate.
 * @returns A validation result containing any detected errors and the parsed version on success.
 *
 * @example
 * ```ts
 * import { validate } from 'versionguard';
 *
 * validate('1.2.3').valid;
 * // => true
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function validate(version: string): ValidationResult {
  const parsed = parse(version);

  if (!parsed) {
    return {
      valid: false,
      errors: getStructuralErrors(version),
    };
  }

  return {
    valid: true,
    errors: [],
    version: { type: 'semver', version: parsed },
  };
}

/**
 * Compares two semantic version strings.
 *
 * @remarks
 * Comparison follows SemVer precedence rules, including special handling for prerelease
 * identifiers and ignoring build metadata.
 *
 * @param a - Left-hand version string.
 * @param b - Right-hand version string.
 * @returns `1` when `a` is greater, `-1` when `b` is greater, or `0` when they are equal.
 *
 * @example
 * ```ts
 * import { compare } from 'versionguard';
 *
 * compare('1.2.3', '1.2.3-alpha.1');
 * // => 1
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function compare(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);

  if (!left || !right) {
    throw new Error(`Invalid SemVer comparison between "${a}" and "${b}"`);
  }

  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) {
      return left[key] > right[key] ? 1 : -1;
    }
  }

  const leftHasPrerelease = left.prerelease.length > 0;
  const rightHasPrerelease = right.prerelease.length > 0;

  if (leftHasPrerelease && !rightHasPrerelease) {
    return -1;
  }

  if (!leftHasPrerelease && rightHasPrerelease) {
    return 1;
  }

  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left.prerelease[index];
    const rightValue = right.prerelease[index];

    if (leftValue === undefined) {
      return -1;
    }

    if (rightValue === undefined) {
      return 1;
    }

    const leftNumeric = /^\d+$/.test(leftValue) ? Number.parseInt(leftValue, 10) : null;
    const rightNumeric = /^\d+$/.test(rightValue) ? Number.parseInt(rightValue, 10) : null;

    if (leftNumeric !== null && rightNumeric !== null) {
      if (leftNumeric !== rightNumeric) {
        return leftNumeric > rightNumeric ? 1 : -1;
      }
      continue;
    }

    if (leftNumeric !== null) {
      return -1;
    }

    if (rightNumeric !== null) {
      return 1;
    }

    if (leftValue !== rightValue) {
      return leftValue > rightValue ? 1 : -1;
    }
  }

  return 0;
}

/**
 * Checks whether one semantic version is greater than another.
 *
 * @remarks
 * This is a convenience wrapper around {@link compare} for callers that only need a boolean.
 *
 * @param a - Left-hand version string.
 * @param b - Right-hand version string.
 * @returns `true` when `a` has higher precedence than `b`.
 *
 * @example
 * ```ts
 * import { gt } from 'versionguard';
 *
 * gt('1.2.4', '1.2.3');
 * // => true
 * ```
 *
 * @see {@link compare} for full precedence ordering.
 * @public
 * @since 0.1.0
 */
export function gt(a: string, b: string): boolean {
  return compare(a, b) > 0;
}

/**
 * Checks whether one semantic version is less than another.
 *
 * @remarks
 * This is a convenience wrapper around {@link compare} for callers that only need a boolean.
 *
 * @param a - Left-hand version string.
 * @param b - Right-hand version string.
 * @returns `true` when `a` has lower precedence than `b`.
 *
 * @example
 * ```ts
 * import { lt } from 'versionguard';
 *
 * lt('1.2.3-alpha.1', '1.2.3');
 * // => true
 * ```
 *
 * @see {@link compare} for full precedence ordering.
 * @public
 * @since 0.1.0
 */
export function lt(a: string, b: string): boolean {
  return compare(a, b) < 0;
}

/**
 * Checks whether two semantic versions are equal in precedence.
 *
 * @remarks
 * This is a convenience wrapper around {@link compare}. Build metadata is ignored because
 * precedence comparisons in SemVer do not consider it.
 *
 * @param a - Left-hand version string.
 * @param b - Right-hand version string.
 * @returns `true` when both versions compare as equal.
 *
 * @example
 * ```ts
 * import { eq } from 'versionguard';
 *
 * eq('1.2.3', '1.2.3');
 * // => true
 * ```
 *
 * @see {@link compare} for full precedence ordering.
 * @public
 * @since 0.1.0
 */
export function eq(a: string, b: string): boolean {
  return compare(a, b) === 0;
}

/**
 * Increments a semantic version string by release type.
 *
 * @remarks
 * Incrementing `major` or `minor` resets lower-order numeric segments. When a prerelease label is
 * provided, it is appended to the newly generated version.
 *
 * @param version - Current semantic version string.
 * @param release - Segment to increment.
 * @param prerelease - Optional prerelease suffix to append to the next version.
 * @returns The incremented semantic version string.
 *
 * @example
 * ```ts
 * import { increment } from 'versionguard';
 *
 * increment('1.2.3', 'minor', 'beta.1');
 * // => '1.3.0-beta.1'
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function increment(
  version: string,
  release: 'major' | 'minor' | 'patch',
  prerelease?: string,
): string {
  const parsed = parse(version);

  if (!parsed) {
    throw new Error(`Invalid SemVer version: ${version}`);
  }

  if (release === 'major') {
    return `${parsed.major + 1}.0.0${prerelease ? `-${prerelease}` : ''}`;
  }

  if (release === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0${prerelease ? `-${prerelease}` : ''}`;
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}${prerelease ? `-${prerelease}` : ''}`;
}

/**
 * Formats a parsed semantic version object.
 *
 * @remarks
 * Prerelease and build metadata segments are only included when their arrays contain values.
 *
 * @param version - Parsed semantic version to serialize.
 * @returns The normalized semantic version string.
 *
 * @example
 * ```ts
 * import { format } from 'versionguard';
 *
 * const version = { major: 1, minor: 2, patch: 3, prerelease: ['rc', '1'], build: ['build', '5'], raw: '1.2.3-rc.1+build.5' };
 *
 * format(version);
 * // => '1.2.3-rc.1+build.5'
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function format(version: SemVer): string {
  let output = `${version.major}.${version.minor}.${version.patch}`;

  if (version.prerelease.length > 0) {
    output += `-${version.prerelease.join('.')}`;
  }

  if (version.build.length > 0) {
    output += `+${version.build.join('.')}`;
  }

  return output;
}
