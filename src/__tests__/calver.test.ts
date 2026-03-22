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

  it('increments patch-based versions', () => {
    expect(calver.increment('2026.3.1', 'YYYY.MM.PATCH')).toBe('2026.3.2');
    expect(calver.increment('2026.03.21', 'YYYY.0M.0D' as never)).toBe('2026.03.21.0');
  });

  it('compares versions chronologically', () => {
    expect(calver.compare('2026.3.2', '2026.3.1', 'YYYY.MM.PATCH')).toBe(1);
    expect(calver.compare('2026.3.1', '2026.3.2', 'YYYY.MM.PATCH')).toBe(-1);
    expect(calver.compare('2026.3.1', '2026.3.1', 'YYYY.MM.PATCH')).toBe(0);
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

    expect(calver.getCurrentVersion('YY.M.PATCH', new Date(2026, 2, 21, 12, 0, 0))).toBe('26.3.0');
    expect(calver.getNextVersions('2026.3.1', 'YYYY.MM.PATCH')).toEqual(['2026.3.0', '2026.3.2']);
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
