/**
 * Calendar version parsing, formatting, and comparison helpers.
 *
 * @packageDocumentation
 */

import type { CalVer, CalVerFormat, ValidationError, ValidationResult } from './types';

/**
 * Parsed token layout for a supported CalVer format string.
 *
 * @public
 * @since 0.1.0
 * @forgeIgnore E020
 */
export interface ParsedCalVerFormat {
  /**
   * Year token captured from the format string.
   */
  year: 'YYYY' | 'YY';

  /**
   * Month token captured from the format string.
   */
  month: 'MM' | 'M' | '0M';

  /**
   * Day token captured from the format string when present.
   *
   * @defaultValue undefined
   */
  day?: 'DD' | 'D' | '0D';

  /**
   * Patch token captured from the format string when present.
   *
   * @defaultValue undefined
   */
  patch?: 'PATCH';
}

/**
 * Breaks a CalVer format string into its component tokens.
 *
 * @remarks
 * This helper is used internally by parsing, formatting, and version generation helpers
 * to decide which date parts or patch counters are present in a given CalVer layout.
 *
 * @param calverFormat - Format string to inspect.
 * @returns The parsed token definition for the requested format.
 *
 * @example
 * ```ts
 * import { parseFormat } from 'versionguard';
 *
 * parseFormat('YYYY.MM.PATCH');
 * // => { year: 'YYYY', month: 'MM', patch: 'PATCH' }
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function parseFormat(calverFormat: CalVerFormat): ParsedCalVerFormat {
  const parts = calverFormat.split('.');
  const result: ParsedCalVerFormat = {
    year: parts[0] as ParsedCalVerFormat['year'],
    month: parts[1] as ParsedCalVerFormat['month'],
  };

  if (parts[2] === 'PATCH') {
    result.patch = 'PATCH';
  } else if (parts[2]) {
    result.day = parts[2] as ParsedCalVerFormat['day'];
  }

  if (parts[3] === 'PATCH') {
    result.patch = 'PATCH';
  }

  return result;
}

function tokenPattern(token: string): string {
  switch (token) {
    case 'YYYY':
      return '(\\d{4})';
    case 'YY':
      return '(\\d{2})';
    case '0M':
    case '0D':
      return '(\\d{2})';
    case 'MM':
    case 'DD':
    case 'M':
    case 'D':
      return '(\\d{1,2})';
    case 'PATCH':
      return '(\\d+)';
    default:
      throw new Error(`Unsupported CalVer token: ${token}`);
  }
}

/**
 * Builds a regular expression that matches a supported CalVer format.
 *
 * @remarks
 * The returned regular expression is anchored to the start and end of the string so it can
 * be used directly for strict validation of a complete version value.
 *
 * @param calverFormat - Format string to convert into a regular expression.
 * @returns A strict regular expression for the supplied CalVer format.
 *
 * @example
 * ```ts
 * import { getRegexForFormat } from 'versionguard';
 *
 * getRegexForFormat('YYYY.0M.0D').test('2026.03.21');
 * // => true
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function getRegexForFormat(calverFormat: CalVerFormat): RegExp {
  const tokens = calverFormat.split('.');
  const pattern = tokens.map(tokenPattern).join('\\.');
  return new RegExp(`^${pattern}$`);
}

/**
 * Parses a CalVer string using the supplied format.
 *
 * @remarks
 * The parser returns `null` when the string does not structurally match the requested format.
 * It does not enforce range rules such as future-date rejection; use {@link validate} for that.
 *
 * @param version - Version string to parse.
 * @param calverFormat - Format expected for the version string.
 * @returns Parsed CalVer components, or `null` when the string does not match the format.
 *
 * @example
 * ```ts
 * import { parse } from 'versionguard';
 *
 * parse('2026.03.21', 'YYYY.0M.0D')?.month;
 * // => 3
 * ```
 *
 * @see {@link validate} to apply date-range and future-date validation.
 * @public
 * @since 0.1.0
 */
export function parse(version: string, calverFormat: CalVerFormat): CalVer | null {
  const match = version.match(getRegexForFormat(calverFormat));

  if (!match) {
    return null;
  }

  const definition = parseFormat(calverFormat);
  const year =
    definition.year === 'YYYY'
      ? Number.parseInt(match[1], 10)
      : 2000 + Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);

  let cursor = 3;
  let day: number | undefined;
  let patch: number | undefined;

  if (definition.day) {
    day = Number.parseInt(match[cursor], 10);
    cursor += 1;
  }

  if (definition.patch) {
    patch = Number.parseInt(match[cursor], 10);
  }

  return {
    year,
    month,
    day,
    patch,
    format: calverFormat,
    raw: version,
  };
}

/**
 * Validates a CalVer string against formatting and date rules.
 *
 * @remarks
 * Validation checks the requested CalVer format, month and day ranges, and optionally rejects
 * future dates relative to the current system date.
 *
 * @param version - Version string to validate.
 * @param calverFormat - Format expected for the version string.
 * @param preventFutureDates - Whether future dates should be reported as errors.
 * @returns A validation result containing any discovered errors and the parsed version on success.
 *
 * @example
 * ```ts
 * import { validate } from 'versionguard';
 *
 * validate('2026.03.21', 'YYYY.0M.0D', false).valid;
 * // => true
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function validate(
  version: string,
  calverFormat: CalVerFormat,
  preventFutureDates: boolean = true,
): ValidationResult {
  const errors: ValidationError[] = [];
  const parsed = parse(version, calverFormat);

  if (!parsed) {
    return {
      valid: false,
      errors: [
        {
          message: `Invalid CalVer format: "${version}". Expected format: ${calverFormat}`,
          severity: 'error',
        },
      ],
    };
  }

  if (parsed.month < 1 || parsed.month > 12) {
    errors.push({
      message: `Invalid month: ${parsed.month}. Must be between 1 and 12.`,
      severity: 'error',
    });
  }

  if (parsed.day !== undefined) {
    if (parsed.day < 1 || parsed.day > 31) {
      errors.push({
        message: `Invalid day: ${parsed.day}. Must be between 1 and 31.`,
        severity: 'error',
      });
    } else {
      const daysInMonth = new Date(parsed.year, parsed.month, 0).getDate();
      if (parsed.day > daysInMonth) {
        errors.push({
          message: `Invalid day: ${parsed.day}. ${parsed.year}-${String(parsed.month).padStart(2, '0')} has only ${daysInMonth} days.`,
          severity: 'error',
        });
      }
    }
  }

  if (preventFutureDates) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    if (parsed.year > currentYear) {
      errors.push({
        message: `Future year not allowed: ${parsed.year}. Current year is ${currentYear}.`,
        severity: 'error',
      });
    } else if (parsed.year === currentYear && parsed.month > currentMonth) {
      errors.push({
        message: `Future month not allowed: ${parsed.year}.${parsed.month}. Current month is ${currentMonth}.`,
        severity: 'error',
      });
    } else if (
      parsed.year === currentYear &&
      parsed.month === currentMonth &&
      parsed.day !== undefined &&
      parsed.day > currentDay
    ) {
      errors.push({
        message: `Future day not allowed: ${parsed.year}.${parsed.month}.${parsed.day}. Current day is ${currentDay}.`,
        severity: 'error',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    version: { type: 'calver', version: parsed },
  };
}

function formatToken(token: string, value: number): string {
  if (token === '0M' || token === '0D') {
    return String(value).padStart(2, '0');
  }

  if (token === 'YY') {
    return String(value % 100).padStart(2, '0');
  }

  return String(value);
}

/**
 * Formats a parsed CalVer object back into a version string.
 *
 * @remarks
 * Missing `day` and `patch` values fall back to `1` and `0` respectively when the selected
 * format requires those tokens.
 *
 * @param version - Parsed CalVer value to serialize.
 * @returns The formatted CalVer string.
 *
 * @example
 * ```ts
 * import { format } from 'versionguard';
 *
 * const version = { year: 2026, month: 3, day: 21, format: 'YYYY.0M.0D', raw: '2026.03.21' };
 *
 * format(version);
 * // => '2026.03.21'
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function format(version: CalVer): string {
  const tokens = version.format.split('.');
  const values: number[] = [version.year, version.month];

  if (tokens.includes('DD') || tokens.includes('D') || tokens.includes('0D')) {
    values.push(version.day ?? 1);
  }

  if (tokens.includes('PATCH')) {
    values.push(version.patch ?? 0);
  }

  return tokens.map((token, index) => formatToken(token, values[index])).join('.');
}

/**
 * Creates the current CalVer string for a format.
 *
 * @remarks
 * This helper derives its values from the provided date and initializes any patch token to `0`.
 * It is useful for generating a same-day baseline before incrementing patch-based formats.
 *
 * @param calverFormat - Format to generate.
 * @param now - Date used as the source for year, month, and day values.
 * @returns The current version string for the requested format.
 *
 * @example
 * ```ts
 * import { getCurrentVersion } from 'versionguard';
 *
 * getCurrentVersion('YYYY.MM.PATCH', new Date('2026-03-21T00:00:00Z'));
 * // => '2026.3.0'
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function getCurrentVersion(calverFormat: CalVerFormat, now: Date = new Date()): string {
  const definition = parseFormat(calverFormat);
  const currentDay = now.getDate();
  const base: CalVer = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: definition.day ? currentDay : undefined,
    patch: definition.patch ? 0 : undefined,
    format: calverFormat,
    raw: '',
  };
  const day = base.day ?? currentDay;
  const patch = base.patch ?? 0;

  return formatToken(definition.year, base.year)
    .concat(`.${formatToken(definition.month, base.month)}`)
    .concat(definition.day ? `.${formatToken(definition.day, day)}` : '')
    .concat(definition.patch ? `.${patch}` : '');
}

/**
 * Compares two CalVer strings using a shared format.
 *
 * @remarks
 * Comparison is performed component-by-component in year, month, day, then patch order.
 * Missing day and patch values are treated as `0` during comparison.
 *
 * @param a - Left-hand version string.
 * @param b - Right-hand version string.
 * @param calverFormat - Format used to parse both versions.
 * @returns `1` when `a` is greater, `-1` when `b` is greater, or `0` when they are equal.
 *
 * @example
 * ```ts
 * import { compare } from 'versionguard';
 *
 * compare('2026.03.2', '2026.03.1', 'YYYY.MM.PATCH');
 * // => 1
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function compare(a: string, b: string, calverFormat: CalVerFormat): number {
  const left = parse(a, calverFormat);
  const right = parse(b, calverFormat);

  if (!left || !right) {
    throw new Error(`Invalid CalVer comparison between "${a}" and "${b}"`);
  }

  for (const key of ['year', 'month', 'day', 'patch'] as const) {
    const leftValue = left[key] ?? 0;
    const rightValue = right[key] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue > rightValue ? 1 : -1;
    }
  }

  return 0;
}

/**
 * Increments a CalVer string.
 *
 * @remarks
 * Patch-based formats increment the existing patch number. Formats without a patch token are
 * promoted to a patch-based output by appending `.PATCH` semantics with an initial value of `0`.
 *
 * @param version - Current version string.
 * @param calverFormat - Format used to parse the current version.
 * @returns The next version string.
 *
 * @example
 * ```ts
 * import { increment } from 'versionguard';
 *
 * increment('2026.03.1', 'YYYY.MM.PATCH');
 * // => '2026.3.2'
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function increment(version: string, calverFormat: CalVerFormat): string {
  const parsed = parse(version, calverFormat);

  if (!parsed) {
    throw new Error(`Invalid CalVer version: ${version}`);
  }

  const definition = parseFormat(calverFormat);
  const next: CalVer = {
    ...parsed,
    raw: version,
  };

  if (definition.patch) {
    const patch = parsed.patch ?? 0;
    next.patch = patch + 1;
  } else {
    next.patch = 0;
    next.format = `${calverFormat}.PATCH` as CalVerFormat;
  }

  return format(next);
}

/**
 * Returns the most likely next CalVer candidates.
 *
 * @remarks
 * The first candidate is the version derived from the current date. The second candidate is the
 * incremented form of the supplied current version.
 *
 * @param currentVersion - Existing project version.
 * @param calverFormat - Format used to generate both candidates.
 * @returns Two candidate version strings ordered as current-date then incremented version.
 *
 * @example
 * ```ts
 * import { getNextVersions } from 'versionguard';
 *
 * getNextVersions('2026.03.1', 'YYYY.MM.PATCH').length;
 * // => 2
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function getNextVersions(currentVersion: string, calverFormat: CalVerFormat): string[] {
  return [getCurrentVersion(calverFormat), increment(currentVersion, calverFormat)];
}
