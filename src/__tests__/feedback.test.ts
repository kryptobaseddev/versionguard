import { afterEach, describe, expect, it, vi } from 'vitest';

import * as calverModule from '../calver';
import { getDefaultConfig } from '../config';
import {
  getChangelogFeedback,
  getSyncFeedback,
  getTagFeedback,
  getVersionFeedback,
} from '../feedback';

describe('feedback helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns actionable semver feedback for common mistakes', () => {
    const config = getDefaultConfig();

    const prefixed = getVersionFeedback('v1.2.3', config);
    expect(prefixed.valid).toBe(false);
    expect(prefixed.suggestions[0]?.fix).toContain('npx versionguard fix --version 1.2.3');

    const stale = getVersionFeedback('1.2.3', config, '1.2.3');
    expect(stale.valid).toBe(false);
    expect(
      stale.suggestions.some((suggestion) =>
        suggestion.fix?.includes('npx versionguard fix --version 1.2.4'),
      ),
    ).toBe(true);

    expect(getVersionFeedback('1.2', config).suggestions[0]?.fix).toContain(
      'npx versionguard fix --version 1.2.0',
    );
    expect(getVersionFeedback('1.2.3.4', config).suggestions[0]?.message).toContain(
      'Use only 3 segments',
    );
    const invalid = getVersionFeedback('abc', config);
    expect(invalid.errors[0]?.message).toContain('Invalid SemVer format');
    expect(invalid.suggestions[0]?.message).toContain('Use format');
  });

  it('flags semver leading zeros, downgrades, and suspicious jumps', () => {
    const config = getDefaultConfig();

    const leadingZeros = getVersionFeedback('01.02.03', config);
    expect(leadingZeros.valid).toBe(false);
    expect(leadingZeros.errors[0]?.message).toContain('leading zero');
    expect(leadingZeros.suggestions[0]?.message).toContain('Remove leading zeros');

    const prereleaseLeadingZero = getVersionFeedback('1.2.3-01', config);
    expect(prereleaseLeadingZero.errors[0]?.message).toContain('prerelease identifier');

    const older = getVersionFeedback('1.2.2', config, '1.2.3');
    expect(older.valid).toBe(false);
    expect(older.errors[0]?.message).toContain('older than previous 1.2.3');
    expect(older.suggestions[0]?.fix).toContain('npx versionguard fix --version 1.2.4');

    const jumped = getVersionFeedback('4.20.30', config, '1.1.1');
    expect(
      jumped.suggestions.some((suggestion) => suggestion.message.includes('Major version jumped')),
    ).toBe(true);
    expect(
      jumped.suggestions.some((suggestion) => suggestion.message.includes('Minor version jumped')),
    ).toBe(true);
    expect(
      jumped.suggestions.some((suggestion) => suggestion.message.includes('Patch version jumped')),
    ).toBe(true);

    const noPreviousFeedback = getVersionFeedback('1.2.3', config, 'not-a-semver');
    expect(noPreviousFeedback.valid).toBe(true);
    expect(noPreviousFeedback.suggestions).toHaveLength(0);
  });

  it('returns actionable calver feedback for invalid formats and future dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));

    const config = getDefaultConfig();
    config.versioning.type = 'calver';
    config.versioning.calver = {
      format: 'YYYY.0M.0D',
      preventFutureDates: true,
    };

    const futureYear = getVersionFeedback('9999.04.05', config);
    expect(futureYear.valid).toBe(false);
    expect(futureYear.suggestions[0]?.fix).toContain('npx versionguard fix --version 2026.04.05');

    const futureMonth = getVersionFeedback('2026.04.05', config);
    expect(futureMonth.valid).toBe(false);
    expect(futureMonth.suggestions[0]?.message).toContain('Current month is 3');
    expect(futureMonth.suggestions[0]?.fix).toContain('npx versionguard fix --version 2026.03.05');

    // Strict regex rejects month 13 at parse level — feedback gives format guidance
    const invalidMonth = getVersionFeedback('2026.13.05', config);
    expect(invalidMonth.valid).toBe(false);
    expect(invalidMonth.suggestions[0]?.message).toContain('Expected format');

    const futureDay = getVersionFeedback('2026.03.20', config);
    expect(futureDay.valid).toBe(false);
    expect(futureDay.suggestions[0]?.message).toContain('Current day is 15');
    expect(futureDay.suggestions[0]?.fix).toContain('npx versionguard fix --version 2026.03.15');

    const invalidDay = getVersionFeedback('2026.02.30', config);
    expect(invalidDay.valid).toBe(false);
    expect(invalidDay.suggestions[0]?.message).toContain('Day must be valid');

    const stale = getVersionFeedback('2026.03.14', config, '2026.03.15');
    expect(stale.valid).toBe(false);
    expect(stale.suggestions[0]?.fix).toContain('npx versionguard fix --version 2026.03.15.0');

    const invalid = getVersionFeedback('not-a-calver', config);
    expect(invalid.suggestions[0]?.message).toContain('Expected format');

    const ignoredPrevious = getVersionFeedback('2026.03.15', config, 'not-a-calver');
    expect(ignoredPrevious.valid).toBe(true);
    expect(ignoredPrevious.errors).toHaveLength(0);
  });

  it('respects calver preventFutureDates configuration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));

    const config = getDefaultConfig();
    config.versioning.type = 'calver';
    config.versioning.calver = {
      format: 'YYYY.MM.PATCH',
      preventFutureDates: false,
    };

    const feedback = getVersionFeedback('2026.4.1', config);
    expect(feedback.valid).toBe(true);
    expect(feedback.errors).toHaveLength(0);
    expect(feedback.suggestions).toHaveLength(0);
  });

  it('formats calver fixes when parsed versions omit raw input', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));

    const config = getDefaultConfig();
    config.versioning.type = 'calver';
    config.versioning.calver = {
      format: 'YYYY.MM.PATCH',
      preventFutureDates: true,
    };

    const parseSpy = vi.spyOn(calverModule, 'parse').mockReturnValueOnce({
      year: 2026,
      month: 4,
      patch: 1,
      format: 'YYYY.MM.PATCH',
      raw: '',
    });

    const result = getVersionFeedback('2026.4.1', config);

    expect(parseSpy).toHaveBeenCalled();
    expect(result.suggestions[0]?.fix).toContain('npx versionguard fix --version 2026.3.1');
  });

  it('throws when calver feedback is requested without calver config', () => {
    const config = getDefaultConfig();
    config.versioning.type = 'calver';
    delete config.versioning.calver;

    expect(() => getVersionFeedback('2026.3.1', config)).toThrow(
      'CalVer configuration is required',
    );
  });

  it('returns sync, changelog, and tag guidance', () => {
    expect(getSyncFeedback('notes.txt', '0.1.0', '1.2.3')).toHaveLength(1);
    expect(getSyncFeedback('README.md', '0.1.0', '1.2.3')).toHaveLength(2);
    expect(getSyncFeedback('src/version.ts', '0.1.0', '1.2.3')).toHaveLength(2);
    expect(getChangelogFeedback(true, '1.2.3')).toHaveLength(0);
    expect(getChangelogFeedback(false, '1.2.3')[0]?.fix).toBe('npx versionguard fix');
    expect(getChangelogFeedback(true, '1.2.3', '1.2.2')).toHaveLength(1);
    expect(getTagFeedback('1.2.3', '1.2.3', false)).toHaveLength(0);
    expect(getTagFeedback('1.2.3', '1.2.3', true)).toHaveLength(1);
    expect(getTagFeedback('v1.2.2', '1.2.3', true)).toHaveLength(2);
  });
});
