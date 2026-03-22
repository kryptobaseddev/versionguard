import { describe, expect, it } from 'vitest';

import * as semver from '../semver';

describe('semver', () => {
  it('parses valid semantic versions with prerelease and build metadata', () => {
    expect(semver.parse('1.2.3-alpha.1+build.5')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: ['alpha', '1'],
      build: ['build', '5'],
      raw: '1.2.3-alpha.1+build.5',
    });
  });

  it('rejects versions with leading zeros', () => {
    const result = semver.validate('01.2.3');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toContain('leading zero');
    expect(semver.validate('1.2.3-01').errors[0]?.message).toContain('prerelease identifier');
  });

  it('reports structural validation errors for common invalid formats', () => {
    expect(semver.validate('v1.2.3')).toMatchObject({
      valid: false,
      errors: [{ message: "Version should not start with 'v': v1.2.3" }],
    });
    expect(semver.validate('1.2.3-alpha.01').errors[0]?.message).toContain(
      'prerelease identifier "01" has a leading zero',
    );
    expect(semver.validate('1.2').errors[0]?.message).toContain('Invalid SemVer format');
  });

  it('returns parsed version details when validation succeeds', () => {
    expect(semver.validate('1.2.3')).toMatchObject({
      valid: true,
      version: {
        type: 'semver',
        version: {
          major: 1,
          minor: 2,
          patch: 3,
        },
      },
    });
  });

  it('compares versions according to semver precedence', () => {
    expect(semver.compare('1.0.0', '1.0.0')).toBe(0);
    expect(semver.compare('1.0.1', '1.0.0')).toBe(1);
    expect(semver.compare('1.0.0-alpha', '1.0.0')).toBe(-1);
    expect(semver.compare('1.0.0-alpha.10', '1.0.0-alpha.2')).toBe(1);
    expect(semver.compare('1.0.0-alpha.2', '1.0.0-alpha.10')).toBe(-1);
    expect(semver.compare('1.0.0-gamma', '1.0.0-beta')).toBe(1);
    expect(semver.compare('1.0.0-beta', '1.0.0-gamma')).toBe(-1);
    expect(semver.compare('1.0.0-alpha.beta', '1.0.0-alpha.1')).toBe(1);
    expect(semver.compare('1.0.0', '1.0.0-alpha')).toBe(1);
    expect(semver.compare('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1);
    expect(semver.compare('1.0.0-alpha.1', '1.0.0-alpha.1.1')).toBe(-1);
    expect(semver.compare('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBe(-1);
    expect(semver.compare('1.0.0-alpha.1', '1.0.0-alpha')).toBe(1);
  });

  it('throws when comparing invalid versions', () => {
    expect(() => semver.compare('1.0', '1.0.0')).toThrow('Invalid SemVer comparison');
  });

  it('exposes boolean comparison helpers', () => {
    expect(semver.gt('1.0.1', '1.0.0')).toBe(true);
    expect(semver.lt('1.0.0-alpha', '1.0.0')).toBe(true);
    expect(semver.eq('1.0.0+build.1', '1.0.0+build.2')).toBe(true);
  });

  it('increments patch, minor, and major versions', () => {
    expect(semver.increment('1.2.3', 'patch')).toBe('1.2.4');
    expect(semver.increment('1.2.3', 'minor')).toBe('1.3.0');
    expect(semver.increment('1.2.3', 'major')).toBe('2.0.0');
    expect(semver.increment('1.2.3', 'patch', 'beta.1')).toBe('1.2.4-beta.1');
    expect(semver.increment('1.2.3', 'minor', 'rc.1')).toBe('1.3.0-rc.1');
    expect(semver.increment('1.2.3', 'major', 'rc.1')).toBe('2.0.0-rc.1');
  });

  it('throws when incrementing an invalid version', () => {
    expect(() => semver.increment('1.2', 'patch')).toThrow('Invalid SemVer version: 1.2');
  });

  it('formats parsed semantic versions', () => {
    expect(
      semver.format({
        major: 2,
        minor: 4,
        patch: 6,
        prerelease: ['rc', '1'],
        build: ['sha', 'abc123'],
        raw: 'ignored',
      }),
    ).toBe('2.4.6-rc.1+sha.abc123');

    expect(
      semver.format({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: [],
        build: [],
        raw: 'ignored',
      }),
    ).toBe('1.0.0');
  });
});
