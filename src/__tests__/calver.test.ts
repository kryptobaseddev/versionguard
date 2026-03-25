import { afterEach, describe, expect, it, vi } from 'vitest';

import * as calver from '../calver';

describe('calver', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses supported formats', () => {
    expect(calver.parse('2026.3.1', 'YYYY.MM.PATCH')).toEqual({
      year: 2026,
      month: 3,
      patch: 1,
      format: 'YYYY.MM.PATCH',
      raw: '2026.3.1',
    });

    expect(calver.parse('2026.03.21', 'YYYY.0M.0D')).toEqual({
      year: 2026,
      month: 3,
      day: 21,
      format: 'YYYY.0M.0D',
      raw: '2026.03.21',
    });

    expect(calver.parse('26.3.7', 'YY.M.PATCH')).toEqual({
      year: 2026,
      month: 3,
      patch: 7,
      format: 'YY.M.PATCH',
      raw: '26.3.7',
    });
  });

  it('parses MICRO as alias for PATCH', () => {
    expect(calver.parse('2026.3.0', 'YYYY.M.MICRO')).toEqual({
      year: 2026,
      month: 3,
      patch: 0,
      format: 'YYYY.M.MICRO',
      raw: '2026.3.0',
    });

    expect(calver.parse('26.03.5', 'YY.0M.MICRO')).toEqual({
      year: 2026,
      month: 3,
      patch: 5,
      format: 'YY.0M.MICRO',
      raw: '26.03.5',
    });
  });

  it('parses YYYY.M.MICRO format (CleoCode/calver.org standard)', () => {
    const result = calver.parse('2026.3.75', 'YYYY.M.MICRO');
    expect(result).toMatchObject({ year: 2026, month: 3, patch: 75 });
  });

  it('parses day+counter formats like YYYY.0M.0D.MICRO', () => {
    const result = calver.parse('2026.03.21.2', 'YYYY.0M.0D.MICRO');
    expect(result).toMatchObject({ year: 2026, month: 3, day: 21, patch: 2 });
  });

  it('validates MICRO format correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T12:00:00Z'));

    expect(calver.validate('2026.3.0', 'YYYY.M.MICRO', false).valid).toBe(true);
    expect(calver.validate('2026.3.0', 'YYYY.M.MICRO', true).valid).toBe(true);
    expect(calver.validate('2027.1.0', 'YYYY.M.MICRO', true).valid).toBe(false);
  });

  it('rejects invalid formats, invalid dates, and future dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T12:00:00Z'));

    expect(calver.validate('not-a-calver', 'YYYY.MM.DD', false)).toMatchObject({
      valid: false,
      errors: [{ message: 'Invalid CalVer format: "not-a-calver". Expected format: YYYY.MM.DD' }],
    });
    expect(calver.validate('2026.13.1', 'YYYY.MM.DD', false).errors[0]?.message).toContain(
      'Invalid month: 13',
    );
    expect(calver.validate('2026.3.32', 'YYYY.MM.DD', false).errors[0]?.message).toContain(
      'Invalid day: 32',
    );
    expect(calver.validate('2026.2.30', 'YYYY.MM.DD', false).errors[0]?.message).toContain(
      'has only 28 days',
    );
    expect(calver.validate('2027.1.1', 'YYYY.MM.DD', true).errors[0]?.message).toContain(
      'Future year',
    );
    expect(calver.validate('2026.4.1', 'YYYY.MM.DD', true).errors[0]?.message).toContain(
      'Future month',
    );
    expect(calver.validate('2026.3.22', 'YYYY.MM.DD', true).errors[0]?.message).toContain(
      'Future day',
    );
  });

  it('increments counter-based versions (PATCH and MICRO)', () => {
    expect(calver.increment('2026.3.1', 'YYYY.MM.PATCH')).toBe('2026.3.2');
    expect(calver.increment('2026.3.1', 'YYYY.M.MICRO')).toBe('2026.3.2');
    expect(calver.increment('2026.03.21', 'YYYY.0M.0D')).toBe('2026.03.21.0');
  });

  it('compares versions chronologically', () => {
    expect(calver.compare('2026.3.2', '2026.3.1', 'YYYY.MM.PATCH')).toBe(1);
    expect(calver.compare('2026.3.1', '2026.3.2', 'YYYY.MM.PATCH')).toBe(-1);
    expect(calver.compare('2026.3.1', '2026.3.1', 'YYYY.MM.PATCH')).toBe(0);
    expect(calver.compare('2026.3.2', '2026.3.1', 'YYYY.M.MICRO')).toBe(1);
  });

  it('formats, derives, and compares alternative calver shapes', () => {
    expect(
      calver.format({
        year: 2026,
        month: 3,
        format: 'YY.M.PATCH',
        raw: 'ignored',
      }),
    ).toBe('26.3.0');

    expect(
      calver.format({
        year: 2026,
        month: 3,
        patch: 75,
        format: 'YYYY.M.MICRO',
        raw: '',
      }),
    ).toBe('2026.3.75');

    expect(calver.getCurrentVersion('YY.M.PATCH', new Date(2026, 2, 21, 12, 0, 0))).toBe('26.3.0');
    expect(calver.getCurrentVersion('YYYY.M.MICRO', new Date(2026, 2, 21, 12, 0, 0))).toBe(
      '2026.3.0',
    );
    expect(calver.getNextVersions('2026.3.1', 'YYYY.MM.PATCH')).toEqual(['2026.3.0', '2026.3.2']);
  });

  it('validates format strings', () => {
    expect(calver.isValidCalVerFormat('YYYY.MM.MICRO')).toBe(true);
    expect(calver.isValidCalVerFormat('YYYY.M.MICRO')).toBe(true);
    expect(calver.isValidCalVerFormat('YY.0M.MICRO')).toBe(true);
    expect(calver.isValidCalVerFormat('YYYY.0M.0D')).toBe(true);
    expect(calver.isValidCalVerFormat('YYYY.0M.0D.MICRO')).toBe(true);
    expect(calver.isValidCalVerFormat('YYYY.WW.MICRO')).toBe(true);
    expect(calver.isValidCalVerFormat('YY.0M')).toBe(true);

    // Invalid
    expect(calver.isValidCalVerFormat('INVALID')).toBe(false);
    expect(calver.isValidCalVerFormat('MM.YYYY')).toBe(false); // Year must be first
    expect(calver.isValidCalVerFormat('YYYY.WW.MM')).toBe(false); // Week + Month mutual exclusion
    expect(calver.isValidCalVerFormat('YYYY.MICRO.MM')).toBe(false); // Counter must be last
  });

  it('throws on unsupported comparisons and increments', () => {
    expect(() => calver.getRegexForFormat('YYYY.INVALID' as never)).toThrow(
      'Unsupported CalVer token: INVALID',
    );
    expect(() => calver.compare('bad', '2026.3.1', 'YYYY.MM.PATCH')).toThrow(
      'Invalid CalVer comparison',
    );
    expect(() => calver.increment('bad', 'YYYY.MM.PATCH')).toThrow('Invalid CalVer version: bad');
  });
});
