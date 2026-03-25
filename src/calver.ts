/**
 * Calendar version parsing, formatting, and comparison helpers.
 *
 * @remarks
 * Supports the full calver.org specification with all standard tokens:
 * Year (`YYYY`, `YY`, `0Y`), Month (`MM`, `M`, `0M`), Week (`WW`, `0W`),
 * Day (`DD`, `D`, `0D`), and Counter (`MICRO`/`PATCH`).
 *
 * `MICRO` is the CalVer-standard name for the counter segment.
 * `PATCH` is accepted as a SemVer-familiar alias and behaves identically.
 *
 * @packageDocumentation
 */

import type { CalVer, CalVerFormat, CalVerToken, ValidationError, ValidationResult } from './types';

/** All recognized CalVer tokens. */
const VALID_TOKENS = new Set<string>([
  'YYYY',
  'YY',
  '0Y',
  'MM',
  'M',
  '0M',
  'WW',
  '0W',
  'DD',
  'D',
  '0D',
  'MICRO',
  'PATCH',
]);

/** Year tokens. */
const YEAR_TOKENS = new Set<string>(['YYYY', 'YY', '0Y']);
/** Month tokens. */
const MONTH_TOKENS = new Set<string>(['MM', 'M', '0M']);
/** Week tokens. */
const WEEK_TOKENS = new Set<string>(['WW', '0W']);
/** Day tokens. */
const DAY_TOKENS = new Set<string>(['DD', 'D', '0D']);
/** Counter tokens (MICRO is canonical, PATCH is alias). */
const COUNTER_TOKENS = new Set<string>(['MICRO', 'PATCH']);

/**
 * Validates that a CalVer format string is composed of valid tokens
 * and follows structural rules.
 *
 * @remarks
 * Structural rules enforced:
 * - Must have at least 2 segments
 * - First segment must be a year token
 * - Week tokens and Month/Day tokens are mutually exclusive
 * - Counter (MICRO/PATCH) can only appear as the last segment
 *
 * @param formatStr - Format string to validate.
 * @returns `true` when the format is valid.
 *
 * @example
 * ```ts
 * import { isValidCalVerFormat } from 'versionguard';
 *
 * isValidCalVerFormat('YYYY.MM.MICRO'); // true
 * isValidCalVerFormat('INVALID');        // false
 * ```
 *
 * @public
 * @since 0.3.0
 */
export function isValidCalVerFormat(formatStr: string): formatStr is CalVerFormat {
  const tokens = formatStr.split('.');
  if (tokens.length < 2) return false;

  // All tokens must be recognized
  if (!tokens.every((t) => VALID_TOKENS.has(t))) return false;

  // First token must be a year
  if (!YEAR_TOKENS.has(tokens[0])) return false;

  // Mutual exclusion: week vs month/day
  const hasWeek = tokens.some((t) => WEEK_TOKENS.has(t));
  const hasMonthOrDay = tokens.some((t) => MONTH_TOKENS.has(t) || DAY_TOKENS.has(t));
  if (hasWeek && hasMonthOrDay) return false;

  // Counter must be last if present
  const counterIndex = tokens.findIndex((t) => COUNTER_TOKENS.has(t));
  if (counterIndex !== -1 && counterIndex !== tokens.length - 1) return false;

  return true;
}

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
  year: 'YYYY' | 'YY' | '0Y';

  /**
   * Month token captured from the format string when present.
   *
   * @defaultValue undefined
   */
  month?: 'MM' | 'M' | '0M';

  /**
   * Week token captured from the format string when present.
   *
   * @defaultValue undefined
   */
  week?: 'WW' | '0W';

  /**
   * Day token captured from the format string when present.
   *
   * @defaultValue undefined
   */
  day?: 'DD' | 'D' | '0D';

  /**
   * Counter token captured from the format string when present.
   * Both `MICRO` and `PATCH` map to the same numeric counter.
   *
   * @defaultValue undefined
   */
  counter?: 'MICRO' | 'PATCH';
}

/**
 * Breaks a CalVer format string into its component tokens.
 *
 * @remarks
 * This helper is used internally by parsing, formatting, and version generation helpers
 * to decide which date parts or counters are present in a given CalVer layout.
 *
 * @param calverFormat - Format string to inspect.
 * @returns The parsed token definition for the requested format.
 *
 * @example
 * ```ts
 * import { parseFormat } from 'versionguard';
 *
 * parseFormat('YYYY.MM.MICRO');
 * // => { year: 'YYYY', month: 'MM', counter: 'MICRO' }
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function parseFormat(calverFormat: CalVerFormat): ParsedCalVerFormat {
  const tokens = calverFormat.split('.');
  const result: ParsedCalVerFormat = {
    year: tokens[0] as ParsedCalVerFormat['year'],
  };

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i] as CalVerToken;
    if (MONTH_TOKENS.has(token)) {
      result.month = token as ParsedCalVerFormat['month'];
    } else if (WEEK_TOKENS.has(token)) {
      result.week = token as ParsedCalVerFormat['week'];
    } else if (DAY_TOKENS.has(token)) {
      result.day = token as ParsedCalVerFormat['day'];
    } else if (COUNTER_TOKENS.has(token)) {
      result.counter = token as ParsedCalVerFormat['counter'];
    }
  }

  return result;
}

function tokenPattern(token: string): string {
  switch (token) {
    case 'YYYY':
      return '(\\d{4})';
    case 'YY':
    case '0Y':
    case '0M':
    case '0D':
    case '0W':
      return '(\\d{2})';
    case 'MM':
    case 'DD':
    case 'M':
    case 'D':
    case 'WW':
      return '(\\d{1,2})';
    case 'MICRO':
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
 * parse('2026.3.0', 'YYYY.M.MICRO')?.month;
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
  const yearToken = definition.year;
  let year = Number.parseInt(match[1], 10);
  if (yearToken === 'YY' || yearToken === '0Y') {
    year = 2000 + year;
  }

  let cursor = 2;
  let month: number | undefined;
  let day: number | undefined;
  let patch: number | undefined;

  if (definition.month) {
    month = Number.parseInt(match[cursor], 10);
    cursor += 1;
  }

  if (definition.week) {
    // Week stored in month field for simplicity in comparison
    month = Number.parseInt(match[cursor], 10);
    cursor += 1;
  }

  if (definition.day) {
    day = Number.parseInt(match[cursor], 10);
    cursor += 1;
  }

  if (definition.counter) {
    patch = Number.parseInt(match[cursor], 10);
  }

  return {
    year,
    month: month ?? 1,
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
 * validate('2026.3.0', 'YYYY.M.MICRO', false).valid;
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

  const definition = parseFormat(calverFormat);

  // Month validation (only when format uses month tokens)
  if (definition.month && (parsed.month < 1 || parsed.month > 12)) {
    errors.push({
      message: `Invalid month: ${parsed.month}. Must be between 1 and 12.`,
      severity: 'error',
    });
  }

  // Week validation
  if (definition.week && (parsed.month < 1 || parsed.month > 53)) {
    errors.push({
      message: `Invalid week: ${parsed.month}. Must be between 1 and 53.`,
      severity: 'error',
    });
  }

  if (parsed.day !== undefined) {
    if (parsed.day < 1 || parsed.day > 31) {
      errors.push({
        message: `Invalid day: ${parsed.day}. Must be between 1 and 31.`,
        severity: 'error',
      });
    } else if (definition.month) {
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
    } else if (definition.month && parsed.year === currentYear && parsed.month > currentMonth) {
      errors.push({
        message: `Future month not allowed: ${parsed.year}.${parsed.month}. Current month is ${currentMonth}.`,
        severity: 'error',
      });
    } else if (
      definition.month &&
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
  switch (token) {
    case '0M':
    case '0D':
    case '0W':
    case '0Y':
      return String(token === '0Y' ? value % 100 : value).padStart(2, '0');
    case 'YY':
      return String(value % 100).padStart(2, '0');
    default:
      return String(value);
  }
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
  const definition = parseFormat(version.format);
  const parts: string[] = [formatToken(definition.year, version.year)];

  if (definition.month) {
    parts.push(formatToken(definition.month, version.month));
  }

  if (definition.week) {
    parts.push(formatToken(definition.week, version.month));
  }

  if (definition.day) {
    parts.push(formatToken(definition.day, version.day ?? 1));
  }

  if (definition.counter) {
    parts.push(formatToken(definition.counter, version.patch ?? 0));
  }

  return parts.join('.');
}

/**
 * Creates the current CalVer string for a format.
 *
 * @remarks
 * This helper derives its values from the provided date and initializes any counter to `0`.
 * It is useful for generating a same-day baseline before incrementing counter-based formats.
 *
 * @param calverFormat - Format to generate.
 * @param now - Date used as the source for year, month, and day values.
 * @returns The current version string for the requested format.
 *
 * @example
 * ```ts
 * import { getCurrentVersion } from 'versionguard';
 *
 * getCurrentVersion('YYYY.M.MICRO', new Date('2026-03-21T00:00:00Z'));
 * // => '2026.3.0'
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function getCurrentVersion(calverFormat: CalVerFormat, now: Date = new Date()): string {
  const definition = parseFormat(calverFormat);
  const base: CalVer = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: definition.day ? now.getDate() : undefined,
    patch: definition.counter ? 0 : undefined,
    format: calverFormat,
    raw: '',
  };

  return format(base);
}

/**
 * Compares two CalVer strings using a shared format.
 *
 * @remarks
 * Comparison is performed component-by-component in year, month, day, then counter order.
 * Missing day and counter values are treated as `0` during comparison.
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
 * compare('2026.3.2', '2026.3.1', 'YYYY.M.MICRO');
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
 * Counter-based formats increment the existing counter. Formats without a counter are
 * promoted to a counter-based output by appending `.MICRO` with an initial value of `0`.
 *
 * @param version - Current version string.
 * @param calverFormat - Format used to parse the current version.
 * @returns The next version string.
 *
 * @example
 * ```ts
 * import { increment } from 'versionguard';
 *
 * increment('2026.3.1', 'YYYY.M.MICRO');
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

  if (definition.counter) {
    next.patch = (parsed.patch ?? 0) + 1;
  } else {
    next.patch = 0;
    next.format = `${calverFormat}.MICRO` as CalVerFormat;
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
 * getNextVersions('2026.3.1', 'YYYY.M.MICRO').length;
 * // => 2
 * ```
 *
 * @public
 * @since 0.1.0
 */
export function getNextVersions(currentVersion: string, calverFormat: CalVerFormat): string[] {
  return [getCurrentVersion(calverFormat), increment(currentVersion, calverFormat)];
}
